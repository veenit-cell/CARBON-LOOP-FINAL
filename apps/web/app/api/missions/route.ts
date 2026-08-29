import { requireAuth } from "@/lib/auth";
import { getGameState } from "@/lib/db";
import { MISSIONS, missionCarbon, derive } from "@/lib/game";
import { greenPointsForAvoidedKgCo2e } from "@carbonloop/scoring";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const state = getGameState(auth.user.id);
  const derived = derive(state);

  const missions = MISSIONS.map((mission) => {
    const completedRuns = state.runs.filter(
      (r) => r.questTemplateId === mission.questTemplateId && r.state === "completed",
    );
    const activeRun = state.runs.find(
      (r) => r.questTemplateId === mission.questTemplateId && r.state === "active",
    );

    // Estimated reward using mission carbon calc
    const carbonResult = missionCarbon(mission, "preview", new Date().toISOString());
    let estimatedPoints = 0;
    let estimatedCo2e = "0.000000";
    if (carbonResult !== undefined && carbonResult.status === "calculated") {
      estimatedPoints = greenPointsForAvoidedKgCo2e(carbonResult.avoidedKgCo2e);
      estimatedCo2e = carbonResult.avoidedKgCo2e;
    }

    let status: "available" | "active" | "completed" = "available";
    if (activeRun) status = "active";
    else if (completedRuns.length > 0) status = "completed";

    return {
      questTemplateId: mission.questTemplateId,
      title: mission.title,
      blurb: mission.blurb,
      difficulty: mission.difficulty,
      activityType: mission.activityType,
      ecoXp: mission.ecoXp,
      estimatedPoints,
      estimatedCo2e,
      carbonClaim: mission.carbonClaim,
      evidenceTier: mission.evidenceTier,
      status,
      activeRunId: activeRun?.questRunId ?? null,
      completedCount: completedRuns.length,
      requiresToken: mission.requiresToken,
    };
  });

  return Response.json({
    missions,
    hasActiveRun: derived.activeRun !== undefined,
  });
}
