import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ code: "UNAUTHORIZED", message: "Not logged in." }, { status: 401 });
  }
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
