import { test as setup } from "@playwright/test";
import { ACCOUNTS, e2ePassword } from "./env";

export const STORAGE_STATE = ".playwright/user.json";

/**
 * Signs in once through the real login form and saves the session cookie, so
 * every nav test starts already authenticated.
 */
setup("sign in as the admin test user", async ({ page }) => {
  const password = e2ePassword();
  setup.skip(!password, "E2E_PASSWORD is not set (environment or .env.local)");

  await page.goto("/login");
  await page.locator("#email").fill(ACCOUNTS.admin);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/marketplace/, { timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
