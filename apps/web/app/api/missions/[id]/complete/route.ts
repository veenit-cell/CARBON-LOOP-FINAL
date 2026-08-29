import { requireAuth } from "@/lib/auth";
import { getGameState, saveGameState } from "@/lib/db";
import { completeMission } from "@/lib/game";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id: questRunId } = await context.params;
  const state = getGameState(auth.user.id);
  const result = completeMission(state, questRunId, new Date().toISOString());

  if (!result.ok) {
    return Response.json({ code: result.code, message: result.message }, { status: 409 });
  }

  saveGameState(auth.user.id, result.state);

  return Response.json({
    outcome: {
      missionTitle: result.outcome.mission.title,
      ecoXpIssued: result.outcome.ecoXpIssued,
      greenPointsIssued: result.outcome.greenPointsIssued,
      noCarbonClaimReason: result.outcome.noCarbonClaimReason,
      leveledUpTo: result.outcome.leveledUpTo,
      carbonResult: result.outcome.carbonResult
        ? {
            status: result.outcome.carbonResult.status,
            ...(result.outcome.carbonResult.status === "calculated"
              ? {
                  baselineKgCo2e: result.outcome.carbonResult.baselineKgCo2e,
                  actualKgCo2e: result.outcome.carbonResult.actualKgCo2e,
                  avoidedKgCo2e: result.outcome.carbonResult.avoidedKgCo2e,
                  evidenceTier: result.outcome.carbonResult.evidenceTier,
                }
              : {}),
          }
        : null,
    },
  });
}
