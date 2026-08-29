import { describe, expect, it } from "vitest";

import {
  MISSIONS,
  REWARDS,
  completeMission,
  derive,
  initialState,
  leaderboard,
  redeemReward,
  startMission,
  type GameState,
} from "@/lib/game";

const T1 = "2026-08-29T09:00:00.000Z";
const T2 = "2026-08-30T09:00:00.000Z";

/** Starts and immediately completes a mission, asserting neither step was rejected. */
function play(state: GameState, questTemplateId: string, at: string) {
  const started = startMission(state, questTemplateId, at);
  if (!started.ok) throw new Error(`start rejected: ${started.code}`);
  const completed = completeMission(started.state, started.run.questRunId, at);
  if (!completed.ok) throw new Error(`complete rejected: ${completed.code}`);
  return completed;
}

describe("game core", () => {
  it("costs each mission with its own emission factor, not the walking one", () => {
    // Regression guard: the shuttle used to be scored with the 0.000 walking factor,
    // which credited a shared motorised ride as if nothing had been emitted.
    const shuttle = play(initialState(), "SIMULATED_DEMO_ONLY_shuttle_quest", T1);
    // 5 km: motorbike baseline 0.500 kg, shuttle actual 0.150 kg, avoided 0.350 kg.
    expect(shuttle.outcome.carbonResult?.status).toBe("calculated");
    expect(shuttle.outcome.carbonResult?.avoidedKgCo2e).toBe("0.350000");
    expect(shuttle.outcome.greenPointsIssued).toBe(14);

    const walk = play(initialState(), "SIMULATED_DEMO_ONLY_walk_quest", T1);
    expect(walk.outcome.carbonResult?.avoidedKgCo2e).toBe("0.250000");
    expect(walk.outcome.greenPointsIssued).toBe(10);
  });

  it("awards Eco XP but no Green Points when nothing motorised is displaced", () => {
    const lunch = play(initialState(), "SIMULATED_DEMO_ONLY_zero_waste_quest", T1);
    expect(lunch.outcome.ecoXpIssued).toBe(60);
    expect(lunch.outcome.greenPointsIssued).toBe(0);
    expect(lunch.outcome.carbonResult).toBeUndefined();
    expect(lunch.outcome.noCarbonClaimReason).toMatch(/no avoided CO2e is claimed/i);
    // No fabricated point: the ledger gains XP only.
    expect(derive(lunch.state).greenPoints).toBe(derive(initialState()).greenPoints);
  });

  it("totals avoided CO2e as an exact decimal, separately from points", () => {
    let state = initialState();
    for (const mission of MISSIONS) state = play(state, mission.questTemplateId, T1).state;
    const derived = derive(state);
    // Walk 0.250000 + cycle 0.600000 + shuttle 0.350000; zero-waste claims nothing.
    expect(derived.avoidedKgCo2e).toBe("1.200000");
    expect(derived.greenPoints).toBe(48);
    expect(derived.ecoXp).toBe(155);
    expect(derived.level).toBe(2);
    expect(derived.xpIntoLevel).toBe(55);
    expect(derived.missionsCompleted).toBe(4);
  });

  it("counts evidence tiers per tier rather than lumping them together", () => {
    let state = initialState();
    for (const mission of MISSIONS) state = play(state, mission.questTemplateId, T1).state;
    // Walk V2, cycle V2, shuttle V1. Zero-waste issues no points, so it has no tier.
    expect(derive(state).tierCounts).toEqual({ V1: 1, V2: 2, V3: 0, V4: 0 });
    expect(derive(state).eligibleJourneys).toBe(3);
  });

  it("refuses to complete a run twice or reuse the shuttle token", () => {
    const shuttle = play(initialState(), "SIMULATED_DEMO_ONLY_shuttle_quest", T1);
    const replay = completeMission(shuttle.state, shuttle.outcome.run.questRunId, T1);
    expect(replay).toMatchObject({ ok: false, code: "QUEST_ALREADY_COMPLETED" });
    const rescan = startMission(shuttle.state, "SIMULATED_DEMO_ONLY_shuttle_quest", T1);
    expect(rescan).toMatchObject({ ok: false, code: "SHUTTLE_TOKEN_REPLAYED" });
  });

  it("allows only one active mission at a time", () => {
    const first = startMission(initialState(), "SIMULATED_DEMO_ONLY_walk_quest", T1);
    if (!first.ok) throw new Error(first.code);
    expect(startMission(first.state, "SIMULATED_DEMO_ONLY_cycle_quest", T1)).toMatchObject({
      ok: false,
      code: "MISSION_ALREADY_ACTIVE",
    });
  });

  it("gates rewards on spendable points and deducts what is committed", () => {
    const canteen = REWARDS[0];
    // A new player has earned nothing, so even the cheapest mock reward is refused.
    expect(redeemReward(initialState(), canteen.rewardItemId, T1)).toMatchObject({
      ok: false,
      code: "INSUFFICIENT_GREEN_POINTS",
    });

    // Walk to Campus pays exactly the canteen reward's cost and nothing more.
    const state = play(initialState(), "SIMULATED_DEMO_ONLY_walk_quest", T1).state;
    expect(derive(state).spendableGreenPoints).toBe(canteen.greenPointsCost);
    const tree = REWARDS.find((reward) => reward.greenPointsCost === 200);
    expect(redeemReward(state, tree!.rewardItemId, T1)).toMatchObject({ ok: false, code: "INSUFFICIENT_GREEN_POINTS" });

    const redeemed = redeemReward(state, canteen.rewardItemId, T1);
    if (!redeemed.ok) throw new Error(redeemed.code);
    expect(redeemed.redemption.state).toBe("reserved");
    expect(derive(redeemed.state).spendableGreenPoints).toBe(0);
    // Lifetime points are a ledger total and must not shrink when points are spent.
    expect(derive(redeemed.state).greenPoints).toBe(canteen.greenPointsCost);
    expect(redeemReward(redeemed.state, canteen.rewardItemId, T1)).toMatchObject({
      ok: false,
      code: "INSUFFICIENT_GREEN_POINTS",
    });
  });

  it("counts a streak across consecutive days", () => {
    const day1 = play(initialState(), "SIMULATED_DEMO_ONLY_walk_quest", T1);
    expect(derive(day1.state).streakDays).toBe(1);
    const day2 = play(day1.state, "SIMULATED_DEMO_ONLY_cycle_quest", T2);
    expect(derive(day2.state).streakDays).toBe(2);
  });

  it("survives a clock that moves backwards instead of wedging the save", () => {
    // A stale localStorage save or a skewed device clock must not brick the ledger,
    // whose events are required to be non-decreasing in time.
    const later = play(initialState(), "SIMULATED_DEMO_ONLY_walk_quest", T2);
    const earlier = play(later.state, "SIMULATED_DEMO_ONLY_cycle_quest", T1);
    expect(derive(earlier.state).missionsCompleted).toBe(2);
    expect(earlier.outcome.run.completedAt).toBe(T2);
  });

  it("ranks the real player inside the synthetic cohort", () => {
    expect(leaderboard(0).find((row) => row.isPlayer)?.rank).toBe(8);
    expect(leaderboard(5000).find((row) => row.isPlayer)?.rank).toBe(1);
    expect(leaderboard(1000)).toHaveLength(8);
  });
});
