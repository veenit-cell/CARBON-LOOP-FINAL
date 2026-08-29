import { requireAuth } from "@/lib/auth";
import { getGameState } from "@/lib/db";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const state = getGameState(auth.user.id);

  const history = state.events.map((event) => ({
    eventId: event.eventId,
    type: event.type,
    amount: "amount" in event ? event.amount : 0,
    occurredAt: event.occurredAt,
    activityType: "activityType" in event ? event.activityType : null,
    avoidedKgCo2e: "avoidedKgCo2e" in event ? event.avoidedKgCo2e : null,
    evidenceTier: "evidenceTier" in event ? event.evidenceTier : null,
  }));

  return Response.json({
    history: history.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  });
}
