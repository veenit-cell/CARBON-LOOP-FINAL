import { requireAuth } from "@/lib/auth";
import { getGameState, getProfile } from "@/lib/db";
import { derive, MISSIONS } from "@/lib/game";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = getProfile(auth.user.id);
  const state = getGameState(auth.user.id);
  const derived = derive(state);

  const health = profile?.googleHealth;
  const googleHealthConnected = !!health?.connected;
  const lastSyncedAt = health?.lastSyncedAt ?? null;
  const activityRecordsCount = health?.activityRecordsCount ?? 0;
  const lastSyncedPeriod = health?.lastSyncedPeriod ?? "Today's Activity";

  // Prevent premature calculation state
  const trackingStarted = profile?.trackingStarted ?? false;
  const demoMode = profile?.demoMode ?? false;
  const carbonCalculated = !!health?.carbonCalculated;

  let trackingState: "NOT_STARTED" | "NOT_CONNECTED" | "CONNECTED_NO_DATA" | "DATA_AVAILABLE" | "CALCULATION_COMPLETE" = "NOT_STARTED";
  if (!trackingStarted) {
    trackingState = "NOT_STARTED";
  } else if (!googleHealthConnected) {
    trackingState = "NOT_CONNECTED";
  } else if (!lastSyncedAt || activityRecordsCount === 0) {
    trackingState = "CONNECTED_NO_DATA";
  } else if (!carbonCalculated) {
    trackingState = "DATA_AVAILABLE";
  } else {
    trackingState = "CALCULATION_COMPLETE";
  }

  const showResults = trackingState === "CALCULATION_COMPLETE";

  // Carbon saved by time period
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const carbonEvents = state.events.filter((e) => e.type === "green_points_issued");
  const carbonToday = carbonEvents.filter((e) => e.occurredAt >= todayStart).reduce((sum, e) => sum + Number(e.avoidedKgCo2e), 0);
  const carbonWeek = carbonEvents.filter((e) => e.occurredAt >= weekStart).reduce((sum, e) => sum + Number(e.avoidedKgCo2e), 0);
  const carbonMonth = carbonEvents.filter((e) => e.occurredAt >= monthStart).reduce((sum, e) => sum + Number(e.avoidedKgCo2e), 0);

  // Active missions
  const activeMissions = state.runs
    .filter((r) => r.state === "active")
    .map((run) => {
      const mission = MISSIONS.find((m) => m.questTemplateId === run.questTemplateId);
      return { ...run, title: mission?.title, ecoXp: mission?.ecoXp, difficulty: mission?.difficulty };
    });

  // Recent activities (last 10 completed)
  const recentActivities = state.runs
    .filter((r) => r.state === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 10)
    .map((run) => {
      const mission = MISSIONS.find((m) => m.questTemplateId === run.questTemplateId);
      return {
        questRunId: run.questRunId,
        title: mission?.title ?? "Unknown Mission",
        activityType: mission?.activityType,
        completedAt: run.completedAt,
        ecoXp: mission?.ecoXp ?? 0,
      };
    });

  // 7-day chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const dayStr = date.toISOString().slice(0, 10);
    const dayCarbon = carbonEvents
      .filter((e) => e.occurredAt.slice(0, 10) === dayStr)
      .reduce((sum, e) => sum + Number(e.avoidedKgCo2e), 0);
    const dayPoints = carbonEvents
      .filter((e) => e.occurredAt.slice(0, 10) === dayStr)
      .reduce((sum, e) => sum + e.amount, 0);
    return { date: dayStr, label: date.toLocaleDateString("en-US", { weekday: "short" }), carbonKg: showResults ? dayCarbon : 0, points: showResults ? dayPoints : 0 };
  });

  return Response.json({
    trackingState,
    googleHealthConnected,
    lastSyncedAt,
    activityRecordsCount,
    lastSyncedPeriod,
    demoMode,
    dataSource: googleHealthConnected ? (demoMode ? "Simulated Demo Activity" : "Google Health API (Fitness Activity)") : "Not Connected",
    carbon: {
      today: showResults ? carbonToday.toFixed(6) : "0.000000",
      week: showResults ? carbonWeek.toFixed(6) : "0.000000",
      month: showResults ? carbonMonth.toFixed(6) : "0.000000",
      total: showResults ? derived.avoidedKgCo2e : "0.000000",
    },
    points: {
      available: derived.spendableGreenPoints,
      lifetime: derived.greenPoints,
    },
    xp: derived.ecoXp,
    level: derived.level,
    levelTitle: derived.levelTitle,
    xpIntoLevel: derived.xpIntoLevel,
    xpForNextLevel: derived.xpForNextLevel,
    streak: derived.streakDays,
    missionsCompleted: derived.missionsCompleted,
    activeMissions,
    recentActivities,
    chartData,
  });
}
