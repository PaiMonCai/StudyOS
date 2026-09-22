import { expect, test } from "@playwright/test";

test("dashboard renders the learner overview and primary navigation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "今天最值得学什么？" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Study" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sessions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Knowledge" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mistakes" })).toBeVisible();
});

test("knowledge tree opens a concept evidence page", async ({ page }) => {
  await page.goto("/knowledge");

  const expectedUtility = page.getByRole("link", {
    name: /期望效用 Expected Utility/,
  });

  await expect(expectedUtility).toBeVisible();
  await expectedUtility.click();

  await expect(
    page.getByRole("heading", { name: "期望效用 Expected Utility" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "为什么是这个掌握度？" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "前置知识" })).toBeVisible();
});

test("a due review enters a bound REVIEW StudySession", async ({ page }) => {
  await page.goto("/reviews");

  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();

  const startButton = page.getByRole("button", { name: "开始复习" }).first();
  await expect(startButton).toBeVisible();
  await startButton.click();

  await expect(page).toHaveURL(/\/study\?sessionId=/);
  await expect(page.getByText(/REVIEW · Active/)).toBeVisible();
  await expect(page.getByText(/Review · priority/)).toBeVisible();
  await expect(
    page.getByPlaceholder(/发送“开始复习”/),
  ).toBeVisible();
});

test("an empty StudySession can be ended and reopened as a summary", async ({
  page,
}) => {
  await page.goto("/study");

  const goal = `Playwright empty session ${Date.now()}`;
  const goalInput = page.getByLabel("本次目标");
  await goalInput.fill(goal);
  await page.getByRole("button", { name: "开始 Session" }).click();

  await expect(page).toHaveURL(/\/study\?sessionId=/);
  await expect(page.getByText(goal)).toBeVisible();

  await page.getByRole("button", { name: "结束 Session" }).click();

  await expect(
    page.getByRole("heading", { name: "本次学习已结束" }),
  ).toBeVisible();
  await expect(page.getByText(/尚未记录可评分作答/)).toBeVisible();

  const sessionUrl = page.url();

  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
  await expect(page.getByText(goal)).toBeVisible();

  await page.getByText(goal).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(
    page.getByRole("heading", { name: "本次学习已结束" }),
  ).toBeVisible();
});

test("review history tabs and mistake workflow pages render", async ({
  page,
}) => {
  await page.goto("/reviews");

  await page.getByRole("button", { name: "Upcoming" }).click();
  await expect(
    page.getByText(/未来复习任务|scheduled/).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Completed" }).click();
  await expect(
    page.getByText(/已完成复习|completed/).first(),
  ).toBeVisible();

  await page.goto("/mistakes");
  await expect(page.getByRole("heading", { name: "Mistakes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolved" })).toBeVisible();
  await expect(page.getByRole("button", { name: "All" })).toBeVisible();
});
