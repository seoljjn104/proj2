import { test, expect, type Page } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

function primaryNav(page: Page) {
  return page.getByRole("navigation", { name: "Primary" });
}

test.describe("app shell navigation", () => {
  test("desktop renders the sidebar with primary links and no hamburger", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/marketplace");

    const nav = primaryNav(page);
    await expect(nav.getByRole("link", { name: "Marketplace" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Matches" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sessions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Profile" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
    await page.screenshot({ path: "test-results/nav-desktop.png", fullPage: true });
  });

  test("desktop sidebar collapses to icons and expands again", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/marketplace");

    const aside = page.locator("aside");
    const expandedWidth = (await aside.boundingBox())!.width;

    // Activate via the keyboard: dev mode's overlay can swallow real clicks,
    // and this also proves the control works for keyboard users.
    async function toggle(name: "Collapse sidebar" | "Expand sidebar") {
      await page.getByRole("button", { name }).focus();
      await page.keyboard.press("Enter");
    }

    await toggle("Collapse sidebar");
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await expect
      .poll(async () => (await aside.boundingBox())!.width)
      .toBeLessThan(expandedWidth - 40);

    // The label is gone from view, but the link is still reachable by name.
    const nav = primaryNav(page);
    await expect(nav.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await page.screenshot({ path: "test-results/nav-desktop-collapsed.png" });

    await toggle("Expand sidebar");
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
  });

  test("mobile drawer opens, then Escape closes it and restores focus", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/marketplace");

    const trigger = page.getByRole("button", { name: "Open navigation" });
    await expect(trigger).toBeVisible();
    await expect(page.locator("aside")).toBeHidden();

    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Sessions" })).toBeVisible();
    await page.screenshot({ path: "test-results/nav-mobile-drawer.png" });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("mobile drawer closes after following a link", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/marketplace");

    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("link", { name: "Sessions" }).click();
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(dialog).toBeHidden();
  });
});
