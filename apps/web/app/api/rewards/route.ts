import { requireAuth } from "@/lib/auth";
import { getGameState } from "@/lib/db";
import { REWARDS, derive } from "@/lib/game";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const state = getGameState(auth.user.id);
  const derived = derive(state);

  const rewards = REWARDS.map((reward) => {
    const owned = state.redemptions.filter((r) => r.rewardItemId === reward.rewardItemId).length;
    return {
      rewardItemId: reward.rewardItemId,
      title: reward.title.replace("SYNTHETIC_TEST_ONLY ", ""),
      blurb: reward.blurb,
      greenPointsCost: reward.greenPointsCost,
      affordable: derived.spendableGreenPoints >= reward.greenPointsCost,
      owned,
    };
  });

  return Response.json({
    rewards,
    availablePoints: derived.spendableGreenPoints,
  });
}
