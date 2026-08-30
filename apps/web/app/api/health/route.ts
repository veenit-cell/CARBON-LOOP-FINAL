/**
 * Service health check for uptime monitoring.
 *
 * Designed for Railway healthchecks and external uptime probes (Google Cloud
 * uptime checks, UptimeRobot, Pingdom, …). Two levels of signal:
 *
 *   - Liveness  — the route responds at all, so the process is up.
 *   - Readiness — the JSON-file persistence layer (`.data/`, see lib/db.ts) is
 *                 present and writable. That directory IS this app's datastore,
 *                 so if it is unreachable we report 503 "degraded" rather than
 *                 falsely reporting healthy.
 *
 * Note: `/api/health/calculate` and `/api/health/sync` are unrelated
 * fitness-data endpoints; this handler only answers the exact `/api/health`.
 */
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Never serve a cached health result to a monitor — evaluate on every request.
export const dynamic = "force-dynamic";

// Captured once at module init; approximates process uptime for this instance.
const startedAt = Date.now();

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {};

  // Readiness: the file-based datastore must exist and be writable.
  try {
    const dataDir = join(process.cwd(), ".data");
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    accessSync(dataDir, constants.W_OK);
    checks.datastore = "ok";
  } catch {
    checks.datastore = "fail";
  }

  const healthy = Object.values(checks).every((c) => c === "ok");

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "carbonloop-web",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
