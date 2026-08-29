import { requireAuth } from "@/lib/auth";
import { getGameState, saveGameState } from "@/lib/db";
import { startMission } from "@/lib/game";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id: questTemplateId } = await context.params;
  const state = getGameState(auth.user.id);
  const result = startMission(state, questTemplateId, new Date().toISOString());

  if (!result.ok) {
    return Response.json({ code: result.code, message: result.message }, { status: 409 });
  }

  saveGameState(auth.user.id, result.state);

  return Response.json({
    questRun: {
      questRunId: result.run.questRunId,
      questTemplateId: result.run.questTemplateId,
      state: result.run.state,
      startedAt: result.run.startedAt,
    },
  });
}
