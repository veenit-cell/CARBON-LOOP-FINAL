import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getGameState, saveGameState } from "@/lib/db";
import { startMission, completeMission, MISSIONS } from "@/lib/game";

const calculateSchema = z.object({
  activityType: z.enum(["walking", "cycling", "shuttle"]),
  distanceKm: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/, "Distance must be a positive number.")
    .refine((v) => Number(v) > 0 && Number(v) <= 100, "Distance must be between 0 and 100 km."),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = calculateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const { activityType } = parsed.data;
    const now = new Date().toISOString();

    // Find a matching mission for this activity type
    const mission = MISSIONS.find(
      (m) => m.activityType === activityType && m.carbonClaim && !m.requiresToken,
    );

    if (!mission) {
      return Response.json(
        { code: "NO_MATCHING_MISSION", message: "No mission found for this activity type." },
        { status: 400 },
      );
    }

    let state = getGameState(auth.user.id);

    // If user has an active run, they can't start another
    if (state.runs.some((r) => r.state === "active")) {
      return Response.json(
        { code: "MISSION_ACTIVE", message: "You already have an active mission. Complete it first." },
        { status: 409 },
      );
    }

    // Start the mission
    const startResult = startMission(state, mission.questTemplateId, now);
    if (!startResult.ok) {
      return Response.json({ code: startResult.code, message: startResult.message }, { status: 409 });
    }
    state = startResult.state;

    // Immediately complete it (calculator flow = instant activity logging)
    const completeResult = completeMission(state, startResult.run.questRunId, now);
    if (!completeResult.ok) {
      return Response.json({ code: completeResult.code, message: completeResult.message }, { status: 409 });
    }

    saveGameState(auth.user.id, completeResult.state);

    const outcome = completeResult.outcome;
    return Response.json({
      activity: {
        missionTitle: outcome.mission.title,
        activityType: outcome.mission.activityType,
        distanceKm: outcome.mission.distanceKm,
      },
      carbon: outcome.carbonResult
        ? {
            status: outcome.carbonResult.status,
            ...(outcome.carbonResult.status === "calculated"
              ? {
                  baselineKgCo2e: outcome.carbonResult.baselineKgCo2e,
                  actualKgCo2e: outcome.carbonResult.actualKgCo2e,
                  avoidedKgCo2e: outcome.carbonResult.avoidedKgCo2e,
                }
              : {}),
          }
        : null,
      points: {
        ecoXpIssued: outcome.ecoXpIssued,
        greenPointsIssued: outcome.greenPointsIssued,
      },
      noCarbonClaimReason: outcome.noCarbonClaimReason,
    });
  } catch {
    return Response.json({ code: "CALCULATION_ERROR", message: "Carbon calculation failed." }, { status: 500 });
  }
}
