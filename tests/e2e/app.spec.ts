import { expect, test } from "@playwright/test";
import { resetE2EDemoData } from "./seed";

test.beforeEach(async () => {
  await resetE2EDemoData();
});

test("parent can enter child mode directly and view today's routines", async ({ page }) => {
  await page.goto("/child/unlock");
  await expect(page.getByRole("heading", { name: /your routines/i })).toBeVisible();
  await expect(page.getByText("My Morning Routine")).toBeVisible();
});

test("child mode locks parent routine editing until parent PIN is entered", async ({ page }) => {
  await page.goto("/child/unlock");

  await expect(page.getByRole("link", { name: /parent unlock/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^routines$/i })).toHaveCount(0);

  await page.goto("/parent/routines");
  await expect(page.getByRole("heading", { name: /unlock parent pages/i })).toBeVisible();
  await page.getByLabel(/enter parent pin/i).fill("2468");
  await page.getByRole("button", { name: /unlock parent pages/i }).click();
  await page.waitForFunction(() => localStorage.getItem("chore-tracker-child-session") === null);
  await page.goto("/parent/routines");

  await expect(page.getByRole("heading", { name: "Templates and chore steps" })).toBeVisible();
  await expect(page.getByRole("button", { name: /edit routine/i }).first()).toBeVisible();
});

test("parent can view dashboard and approval queue", async ({ page }) => {
  await page.goto("/parent/dashboard");
  await expect(page.getByRole("heading", { name: /this week for/i })).toBeVisible();
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

test("parent can create a new routine", async ({ page }) => {
  await page.goto("/parent/routines");
  await expect(page.getByRole("heading", { name: "Templates and chore steps" })).toBeVisible();
  await expect(page.getByText("My Morning Routine")).toBeVisible();

  await page
    .getByRole("button", { name: /^create routine$/i })
    .first()
    .click();
  await page.getByLabel(/routine name/i).fill("Weekend Reset Routine");
  await page.getByLabel(/^Title$/i).fill("Sort Pokemon cards");
  await page.getByLabel(/illustration key/i).fill("cards");
  await page.getByLabel(/description/i).fill("Put the cards back into the storage box.");
  await page.getByLabel(/points/i).fill("7");
  await expect(page.getByText(/household context is still loading/i)).toHaveCount(0);
  await page
    .getByRole("button", { name: /^create routine$/i })
    .last()
    .click();

  await expect(page.getByText("Weekend Reset Routine").first()).toBeVisible();
  await expect(page.getByText(/Sort Pokemon cards/).first()).toBeVisible();
});

test("parent can create and customise reward visuals with uploaded images and SVG icons", async ({
  page,
}) => {
  await page.goto("/parent/rewards");
  await expect(page.getByRole("heading", { name: /42 points/i })).toBeVisible();
  await expect(page.getByText("Family film night")).toBeVisible();

  await page.getByLabel(/reward title/i).fill("Pizza night choice");
  await page.getByLabel(/points cost/i).fill("25");
  await page
    .getByLabel(/upload reward image file/i)
    .setInputFiles("docs/img/me04-pokemon-center-elite-trainer-box-169-en.png");
  await expect(page.getByText("Reward image uploaded.")).toBeVisible();
  await page.getByRole("button", { name: /create reward/i }).click();

  await expect(page.getByText("Pizza night choice").first()).toBeVisible();
  await expect(page.getByText("25 points").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Pizza night choice" }).first()).toBeVisible();

  await page.getByRole("button", { name: /edit reward pizza night choice/i }).click();
  await page.getByRole("button", { name: /choose music reward icon/i }).click();
  await page.getByRole("button", { name: /save changes/i }).click();

  await expect(page.getByText("Reward saved.")).toBeVisible();
  await expect(page.getByTestId("reward-icon-music")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Pizza night choice").first()).toBeVisible();
  await expect(page.getByText("25 points").first()).toBeVisible();
  await expect(page.getByText("Active").first()).toBeVisible();
  await expect(page.getByTestId("reward-icon-music")).toBeVisible();

  await page.getByRole("button", { name: /create reward/i }).click();
  await expect(page.getByText("Reward title is required.")).toBeVisible();
});

test("child can submit repeated chores and parent approves full then half points", async ({
  page,
}) => {
  await page.goto("/child/unlock");
  await expect(page.getByRole("heading", { name: /your routines/i })).toBeVisible();

  await page.goto("/child/chores");
  await expect(page.getByRole("heading", { name: /extra chores/i })).toBeVisible();
  await expect(page.getByText("Water the plants")).toBeVisible();
  await expect(page.getByText("Full reward: 2 x 3")).toBeVisible();
  await page
    .getByRole("button", { name: /submit for approval/i })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /submitted/i })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Repeat reward: 2 x 3")).toBeVisible();
  await page
    .getByRole("button", { name: /submit for approval/i })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /submitted/i })).toBeVisible();

  await page.goto("/child/parent-unlock");
  await page.getByLabel(/enter parent pin/i).fill("2468");
  await page.getByRole("button", { name: /unlock parent pages/i }).click();
  await page.waitForFunction(() => localStorage.getItem("chore-tracker-child-session") === null);
  await page.goto("/parent/approvals");

  const choreApprovals = page
    .getByTestId("chore-approval-card")
    .filter({ hasText: "Water the plants" });
  await expect(choreApprovals).toHaveCount(2);
  await expect(choreApprovals.filter({ hasText: "6 points" })).toHaveCount(1);
  await expect(choreApprovals.filter({ hasText: "3 points" })).toHaveCount(1);
  await choreApprovals
    .first()
    .getByRole("button", { name: /approve/i })
    .click();
  await expect(choreApprovals).toHaveCount(1);
  await choreApprovals
    .first()
    .getByRole("button", { name: /approve/i })
    .click();
  await expect(choreApprovals).toHaveCount(0);

  await page.goto("/parent/rewards");
  await expect(page.getByRole("heading", { name: /51 points/i })).toBeVisible();
});
