import { test, expect } from "@playwright/test";

const LOGGED_OUT = { storageState: { cookies: [], origins: [] } };

test.describe("auth popups on the landing page", () => {
  test.use(LOGGED_OUT);

  test("sign-in popup opens, blurs the backdrop, and closes with the X", async ({
    page,
  }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Sign in" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Sign in" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#email")).toBeFocused();

    const backdrop = page.locator(".auth-backdrop");
    await expect(backdrop).toHaveCount(1);
    const blur = await backdrop.evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(blur).toContain("blur");
    await page.screenshot({ path: "test-results/landing-signin-popup.png" });

    await dialog.getByRole("button", { name: "Close Sign in" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("create-account popup opens from the hero and Escape closes it", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator("main")
      .getByRole("button", { name: "Create your account" })
      .first()
      .click();

    const dialog = page.getByRole("dialog", { name: "Create your account" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#name")).toBeFocused();
    await expect(dialog.getByRole("button", { name: "Sign up" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("sign-in and create-account popups switch into each other", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).click();

    const login = page.getByRole("dialog", { name: "Sign in" });
    await login.getByRole("button", { name: "Create your account" }).click();
    const signup = page.getByRole("dialog", { name: "Create your account" });
    await expect(signup).toBeVisible();
    await expect(signup.locator("#name")).toBeFocused();

    await signup.getByRole("button", { name: "Sign in" }).click();
    await expect(login).toBeVisible();
  });

  test("deep link /?auth=signup auto-opens the popup and cleans the URL on close", async ({
    page,
  }) => {
    await page.goto("/?auth=signup");
    const dialog = page.getByRole("dialog", { name: "Create your account" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Close Create your account" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL("http://localhost:3000/");
  });

  test("legacy /login and /signup URLs land on the home popup", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/\?auth=login$/);
    await expect(page.getByRole("dialog", { name: "Sign in" })).toBeVisible();

    await page.goto("/signup");
    await expect(page).toHaveURL(/\/\?auth=signup$/);
    await expect(page.getByRole("dialog", { name: "Create your account" })).toBeVisible();
    await page.screenshot({ path: "test-results/landing-home.png", fullPage: true });
  });
});

test.describe("signing out", () => {
  test("lands on home and the back button cannot restore the app", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();

    await page.locator("aside").getByRole("button", { name: "Sign out" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Sign out" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL("http://localhost:3000/");
    await page.screenshot({ path: "test-results/signed-out-home.png" });

    // History back must not resurrect the app shell; middleware bounces a
    // sessionless request to the home popup instead.
    await page.goBack();
    await expect(page).not.toHaveURL(/\/marketplace/);
    await expect(
      page.getByRole("heading", { name: /teach what you know/i }),
    ).toBeVisible();
  });
});