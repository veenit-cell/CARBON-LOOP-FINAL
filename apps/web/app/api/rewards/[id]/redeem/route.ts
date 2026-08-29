import { requireAuth } from "@/lib/auth";
import { getGameState, saveGameState } from "@/lib/db";
import { redeemReward } from "@/lib/game";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id: rewardItemId } = await context.params;
  const state = getGameState(auth.user.id);
  const result = redeemReward(state, rewardItemId, new Date().toISOString());

  if (!result.ok) {
    return Response.json({ code: result.code, message: result.message }, { status: 409 });
  }

  saveGameState(auth.user.id, result.state);

  return Response.json({
    redemption: {
      redemptionId: result.redemption.redemptionId,
      rewardItemId: result.redemption.rewardItemId,
      state: result.redemption.state,
      redeemedAt: result.redemption.redeemedAt,
    },
  });
}
