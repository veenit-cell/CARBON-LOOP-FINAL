import { expect, test } from "@playwright/test";

test("health page reports that the application is healthy", async ({
  page,
}) => {
  await page.goto("/health");

  await expect(
    page.getByRole("heading", { name: "Application healthy" }),
  ).toBeVisible();
});
