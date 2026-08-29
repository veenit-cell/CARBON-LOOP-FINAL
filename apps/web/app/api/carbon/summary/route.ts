import { requireAuth } from "@/lib/auth";
import { getGameState } from "@/lib/db";
import { derive } from "@/lib/game";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const state = getGameState(auth.user.id);
  const derived = derive(state);

  const carbonEvents = state.events.filter((e) => e.type === "green_points_issued");

  // By activity type
  const byActivity: Record<string, number> = {};
  for (const event of carbonEvents) {
    const type = event.activityType;
    byActivity[type] = (byActivity[type] ?? 0) + Number(event.avoidedKgCo2e);
  }

  return Response.json({
    total: derived.avoidedKgCo2e,
    byActivity,
    totalCalculations: carbonEvents.length,
    evidenceTiers: derived.tierCounts,
  });
}
