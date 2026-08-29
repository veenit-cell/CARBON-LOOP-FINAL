import { requireAuth } from "@/lib/auth";
import { getGameState } from "@/lib/db";
import { MISSIONS } from "@/lib/game";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const state = getGameState(auth.user.id);
  const activities = state.runs
    .filter((r) => r.state === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .map((run) => {
      const mission = MISSIONS.find((m) => m.questTemplateId === run.questTemplateId);
      return {
        questRunId: run.questRunId,
        title: mission?.title ?? "Unknown Mission",
        activityType: mission?.activityType ?? "unknown",
        difficulty: mission?.difficulty ?? "EASY",
        ecoXp: mission?.ecoXp ?? 0,
        carbonClaim: mission?.carbonClaim ?? false,
        completedAt: run.completedAt,
      };
    });

  return Response.json({ activities });
}
