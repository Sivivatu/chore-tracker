import { expect, test } from "@playwright/test";
import { resetE2EDemoData } from "./seed";

test.beforeEach(async () => {
  await resetE2EDemoData();
});

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

test("parent can edit a demo routine and keep edit history", async ({ page }) => {
  await page.goto("/parent/routines");
  await expect(page.getByRole("heading", { name: "Templates and chore steps" })).toBeVisible();
  await expect(page.getByText("My Morning Routine")).toBeVisible();

  await page
    .getByRole("button", { name: /edit routine/i })
    .first()
    .click();
  await expect(page.getByLabel(/keep edit history/i)).toBeChecked();

  await page.getByLabel(/routine name/i).fill("School Morning Routine");
  await page.getByRole("button", { name: /add step/i }).click();
  await page
    .getByLabel(/^Title$/i)
    .last()
    .fill("Check water bottle");
  await page
    .getByLabel(/illustration key/i)
    .last()
    .fill("bottle");
  await page
    .getByLabel(/description/i)
    .last()
    .fill("Make sure the bottle is full.");
  await page
    .getByLabel(/points/i)
    .last()
    .fill("2");

  await page.getByRole("button", { name: /save changes/i }).click();

  await expect(page.getByText("School Morning Routine").first()).toBeVisible();
  await expect(page.getByText(/My Morning Routine archived/)).toBeVisible();
});
