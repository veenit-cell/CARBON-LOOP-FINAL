import { requireAuth } from "@/lib/auth";
import { disconnectGoogleHealth } from "@/lib/db";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const updatedProfile = disconnectGoogleHealth(auth.user.id);
  return Response.json({
    ok: true,
    message: "Google Health connection disconnected successfully.",
    profile: updatedProfile,
  });
}
