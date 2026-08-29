import { z } from "zod";

export const environmentSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "preview", "staging", "production"]).default("local"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export function parseEnvironment(input: Record<string, string | undefined>) {
  return environmentSchema.parse(input);
}

export const environment = parseEnvironment({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const appEnvironment = environment.NEXT_PUBLIC_APP_ENV;
