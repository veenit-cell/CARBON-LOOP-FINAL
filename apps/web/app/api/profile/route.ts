import { requireAuth } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/db";
import { getGameState } from "@/lib/db";
import { derive } from "@/lib/game";
import { z } from "zod";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = getProfile(auth.user.id);
  const state = getGameState(auth.user.id);
  const derived = derive(state);

  // Derive badges
  const badges: Array<{ id: string; title: string; description: string; earned: boolean }> = [
    { id: "first_mission", title: "First Steps", description: "Complete your first mission", earned: derived.missionsCompleted >= 1 },
    { id: "five_missions", title: "Eco Warrior", description: "Complete 5 missions", earned: derived.missionsCompleted >= 5 },
    { id: "ten_missions", title: "Climate Champion", description: "Complete 10 missions", earned: derived.missionsCompleted >= 10 },
    { id: "level_3", title: "Rising Star", description: "Reach level 3", earned: derived.level >= 3 },
    { id: "level_5", title: "Trailblazer", description: "Reach level 5", earned: derived.level >= 5 },
    { id: "streak_3", title: "On a Roll", description: "Maintain a 3-day streak", earned: derived.streakDays >= 3 },
    { id: "streak_7", title: "Unstoppable", description: "Maintain a 7-day streak", earned: derived.streakDays >= 7 },
    { id: "carbon_1kg", title: "Carbon Saver", description: "Avoid 1 kg CO₂e", earned: Number(derived.avoidedKgCo2e) >= 1 },
    { id: "first_redeem", title: "Redeemer", description: "Redeem your first reward", earned: state.redemptions.length >= 1 },
  ];

  const safeGoogleHealth = profile?.googleHealth
    ? {
        connected: profile.googleHealth.connected,
        connectedAt: profile.googleHealth.connectedAt,
        scope: profile.googleHealth.scope,
        lastSyncedAt: profile.googleHealth.lastSyncedAt,
        activityRecordsCount: profile.googleHealth.activityRecordsCount,
        lastSyncedPeriod: profile.googleHealth.lastSyncedPeriod,
      }
    : { connected: false };

  return Response.json({
    profile: profile
      ? {
          ...profile,
          googleHealth: safeGoogleHealth,
          trackingStarted: profile.trackingStarted ?? false,
          demoMode: profile.demoMode ?? false,
        }
      : {
          displayName: auth.user.name,
          email: auth.user.email,
          googleHealth: safeGoogleHealth,
          trackingStarted: false,
          demoMode: false,
        },
    stats: {
      level: derived.level,
      levelTitle: derived.levelTitle,
      xp: derived.ecoXp,
      greenPoints: derived.greenPoints,
      avoidedKgCo2e: derived.avoidedKgCo2e,
      missionsCompleted: derived.missionsCompleted,
      streakDays: derived.streakDays,
    },
    badges,
  });
}

const updateSchema = z.object({
  displayName: z.string().min(2).optional(),
  preferences: z.object({
    notifications: z.boolean().optional(),
    darkMode: z.boolean().optional(),
  }).optional(),
  trackingStarted: z.boolean().optional(),
  demoMode: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const updated = updateProfile(auth.user.id, parsed.data);
    return Response.json({ profile: updated });
  } catch {
    return Response.json({ code: "UPDATE_ERROR", message: "Failed to update profile." }, { status: 500 });
  }
}
