import { z } from "zod";
import { findUserByEmail } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const user = findUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json(
        { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createSessionCookie(user.id);

    return Response.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return Response.json({ code: "LOGIN_ERROR", message: "Login failed." }, { status: 500 });
  }
}
