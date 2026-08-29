import { z } from "zod";
import { createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    if (findUserByEmail(email)) {
      return Response.json(
        { code: "EMAIL_EXISTS", message: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(email, name, passwordHash);
    await createSessionCookie(user.id);

    return Response.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed.";
    return Response.json({ code: "SIGNUP_ERROR", message }, { status: 500 });
  }
}
