import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";

const baseUrl = "http://127.0.0.1:3103/api/v1";
let server: ChildProcess;

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.status < 500) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next.js test server did not start");
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() };
}

async function reset(idempotencyKey = crypto.randomUUID()) { return request("/demo/reset", { method: "POST", headers: headers(idempotencyKey), body: "{}" }); }

function headers(idempotencyKey?: string): HeadersInit {
  return {
    "content-type": "application/json",
    "x-request-id": crypto.randomUUID(),
    ...(idempotencyKey === undefined ? {} : { "idempotency-key": idempotencyKey }),
  };
}

function expectTruthLabels(value: unknown): void {
  expect(value).toMatchObject({ truthLabels: expect.any(Array) });
  expect((value as { truthLabels: string[] }).truthLabels.length).toBeGreaterThan(0);
}

beforeAll(async () => {
  server = spawn(process.execPath, ["../../node_modules/next/dist/bin/next", "dev", "--port", "3103"], {
    cwd: "apps/web",
    stdio: "ignore",
  });
  await waitForServer();
}, 20_000);

afterAll(() => server?.kill());

describe("Fast-Track Batch 3 demo API", () => {
  it("restores a deterministic demo-only seed", async () => { const before = await request("/scores/ledger"); await request("/quest-runs", { method: "POST", headers: headers("seed-mutation"), body: JSON.stringify({ questTemplateId: "SIMULATED_DEMO_ONLY_walk_quest" }) }); const result = await reset("seed-reset"); const after = await request("/scores/ledger"); expect(result.body).toMatchObject({ reset: "SIMULATED_DEMO_ONLY", persistence: expect.stringContaining("not production") }); expect(after.body.events).toEqual(before.body.events); expectTruthLabels(result.body); });
  it("makes repeated demo resets idempotent", async () => { await reset("repeat-reset"); await request("/quest-runs", { method: "POST", headers: headers("repeat-mutation"), body: JSON.stringify({ questTemplateId: "SIMULATED_DEMO_ONLY_walk_quest" }) }); const repeated = await reset("repeat-reset"); const ledger = await request("/scores/ledger"); expect(repeated.response.status).toBe(200); expect(ledger.body.events).toHaveLength(1); });
  it("returns labelled deterministic demo health and quests", async () => {
    const health = await request("/health");
    const quests = await request("/quests");
    expect(health.response.status).toBe(200);
    expect(health.body.status).toBe("ok");
    expectTruthLabels(health.body);
    expect(quests.response.status).toBe(200);
    expect(quests.body.quests).toHaveLength(2);
    expectTruthLabels(quests.body);
  });

  it("returns a stable labelled validation error", async () => {
    const result = await request("/quest-runs", { method: "POST", headers: headers("quest-invalid"), body: "{}" });
    expect(result.response.status).toBe(400);
    expect(result.body).toMatchObject({ code: "VALIDATION_ERROR", message: expect.any(String), requestId: expect.any(String) });
    expectTruthLabels(result.body);
  });

  it("requires idempotency keys for writes", async () => {
    const result = await request("/quest-runs", { method: "POST", headers: headers(), body: JSON.stringify({ questTemplateId: "SIMULATED_DEMO_ONLY_walk_quest" }) });
    expect(result.response.status).toBe(400);
    expect(result.body.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expectTruthLabels(result.body);
  });

  it("allows a simulated walking run to be completed only once", async () => {
    const created = await request("/quest-runs", { method: "POST", headers: headers("quest-start-1"), body: JSON.stringify({ questTemplateId: "SIMULATED_DEMO_ONLY_walk_quest" }) });
    expect(created.response.status).toBe(201);
    const completed = await request(`/quest-runs/${created.body.questRun.questRunId}/complete`, { method: "POST", headers: headers("quest-complete-1"), body: JSON.stringify({ distanceKm: "2.5", replacedMotorizedBaseline: true }) });
    expect(completed.response.status).toBe(200);
    expect(completed.body.greenPointsIssued).toBeGreaterThan(0);
    expectTruthLabels(completed.body);
    const duplicate = await request(`/quest-runs/${created.body.questRun.questRunId}/complete`, { method: "POST", headers: headers("quest-complete-2"), body: JSON.stringify({ distanceKm: "2.5", replacedMotorizedBaseline: true }) });
    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.code).toBe("QUEST_ALREADY_COMPLETED");
    expectTruthLabels(duplicate.body);
  });

  it("rejects replay of a synthetic demo shuttle token", async () => {
    const first = await request("/evidence/shuttle-checkin", { method: "POST", headers: headers("shuttle-1"), body: JSON.stringify({ token: "SIMULATED_DEMO_ONLY_shuttle_token_one" }) });
    expect(first.response.status).toBe(200);
    expect(first.body.evidence.tier).toBe("V1");
    expectTruthLabels(first.body);
    const replay = await request("/evidence/shuttle-checkin", { method: "POST", headers: headers("shuttle-2"), body: JSON.stringify({ token: "SIMULATED_DEMO_ONLY_shuttle_token_one" }) });
    expect(replay.response.status).toBe(409);
    expect(replay.body.code).toBe("SHUTTLE_TOKEN_REPLAYED");
    expectTruthLabels(replay.body);
  });

  it("exposes only Green Point eligible ledger entries", async () => {
    const ledger = await request("/scores/ledger");
    expect(ledger.response.status).toBe(200);
    expect(ledger.body.events.some((event: { type: string }) => event.type === "green_points_issued")).toBe(true);
    expectTruthLabels(ledger.body);
  });

  it("keeps mock redemption idempotent and labels the catalogue", async () => {
    const catalogue = await request("/rewards/catalogue");
    expect(catalogue.response.status).toBe(200);
    expect(catalogue.body.rewards[0].catalogueLabel).toBe("MOCK_DEMO_ONLY");
    expectTruthLabels(catalogue.body);
    const payload = JSON.stringify({ rewardItemId: "SYNTHETIC_TEST_ONLY_canteen_reward" });
    const first = await request("/rewards/redemptions", { method: "POST", headers: headers("redeem-1"), body: payload });
    const repeated = await request("/rewards/redemptions", { method: "POST", headers: headers("redeem-1"), body: payload });
    expect(first.response.status).toBe(201);
    expect(repeated.response.status).toBe(200);
    expect(repeated.body.redemption.redemptionId).toBe(first.body.redemption.redemptionId);
    expectTruthLabels(first.body);
    expectTruthLabels(repeated.body);
  });

  it("returns a privacy-safe synthetic campus aggregate", async () => {
    const overview = await request("/campus/overview");
    expect(overview.response.status).toBe(200);
    expect(overview.body.aggregate.privacyThresholdApplied).toBe(true);
    expect(JSON.stringify(overview.body)).not.toContain("displayName");
    expectTruthLabels(overview.body);
  });

  it("labels player progress", async () => {
    const progress = await request("/player/progress");
    expect(progress.response.status).toBe(200);
    expectTruthLabels(progress.body);
  });
});
