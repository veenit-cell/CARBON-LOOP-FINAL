import { requireAuth } from "@/lib/auth";
import { getGameState } from "@/lib/db";
import { derive } from "@/lib/game";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const state = getGameState(auth.user.id);
  const derived = derive(state);

  return Response.json({
    available: derived.spendableGreenPoints,
    lifetime: derived.greenPoints,
    xp: derived.ecoXp,
    level: derived.level,
    levelTitle: derived.levelTitle,
    streak: derived.streakDays,
    xpIntoLevel: derived.xpIntoLevel,
    xpForNextLevel: derived.xpForNextLevel,
  });
}
