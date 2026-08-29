import { requireAuth } from "@/lib/auth";
import { getProfile, getGameState, saveGameState, saveGoogleHealthCalculation } from "@/lib/db";
import { startMission, completeMission, MISSIONS } from "@/lib/game";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = getProfile(auth.user.id);
  if (!profile?.googleHealth?.connected) {
    return Response.json(
      { code: "GOOGLE_HEALTH_NOT_CONNECTED", message: "Google Health is not connected." },
      { status: 400 }
    );
  }

  const recordsCount = profile.googleHealth.activityRecordsCount ?? 0;
  if (!profile.googleHealth.lastSyncedAt || recordsCount === 0) {
    return Response.json(
      { code: "NO_ACTIVITY_DATA", message: "No synced activity data available to calculate carbon footprint." },
      { status: 400 }
    );
  }

  let state = getGameState(auth.user.id);
  const walkMission = MISSIONS.find((m) => m.activityType === "walking" && m.carbonClaim);

  if (!walkMission) {
    return Response.json(
      { code: "MISSION_NOT_FOUND", message: "Walking mission template not found." },
      { status: 500 }
    );
  }

  // Check if user has an active mission run
  if (state.runs.some((r) => r.state === "active")) {
    return Response.json(
      { code: "ACTIVE_MISSION", message: "Please complete or abandon your active mission first." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  let carbonCalculated = null;

  const startRes = startMission(state, walkMission.questTemplateId, now);
  if (!startRes.ok) {
    return Response.json({ code: startRes.code, message: startRes.message }, { status: 409 });
  }

  state = startRes.state;
  const completeRes = completeMission(state, startRes.run.questRunId, now);
  if (!completeRes.ok) {
    return Response.json({ code: completeRes.code, message: completeRes.message }, { status: 409 });
  }

  state = completeRes.state;
  saveGameState(auth.user.id, state);
  saveGoogleHealthCalculation(auth.user.id);
  carbonCalculated = completeRes.outcome.carbonResult;

  return Response.json({
    ok: true,
    status: "CALCULATED",
    message: "Carbon footprint calculated successfully.",
    carbonCalculated,
  });
}
