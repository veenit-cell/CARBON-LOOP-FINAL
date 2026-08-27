import { describe, expect, it } from "vitest";

import { parseEnvironment } from "@/lib/env";

describe("environment validation", () => {
  it("uses safe local defaults for the repository foundation", () => {
    expect(parseEnvironment({})).toEqual({
      NEXT_PUBLIC_APP_ENV: "local",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });
});
