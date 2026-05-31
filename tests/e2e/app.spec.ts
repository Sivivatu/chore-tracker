import { expect, test } from "@playwright/test";

test("child can unlock and view today's routines", async ({ page }) => {
  await page.goto("/child/unlock");
  await page.getByLabel("Enter your PIN").fill("1234");
  await page.getByRole("button", { name: "Unlock routines" }).click();
  await expect(page.getByRole("heading", { name: /your routines/i })).toBeVisible();
  await expect(page.getByText("My Morning Routine")).toBeVisible();
});

test("parent can view dashboard and approval queue", async ({ page }) => {
  await page.goto("/parent/dashboard");
  await expect(page.getByRole("heading", { name: /today for/i })).toBeVisible();
  await page.getByRole("link", { name: /approvals/i }).click();
  await expect(page.getByRole("heading", { name: "Submitted routines" })).toBeVisible();
  await expect(page.getByRole("button", { name: /approve/i })).toBeVisible();
});
