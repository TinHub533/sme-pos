import { test, expect } from "@playwright/test";
import { onboardShop, login, signOut } from "./helpers";

test.describe("Onboarding and login", () => {
  test("onboarding creates a shop and signs the owner in immediately", async ({ page }) => {
    await onboardShop(page, "Onboard Test");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  });

  test("sign out then sign back in with the same credentials", async ({ page }) => {
    const shop = await onboardShop(page, "Login Test");
    await signOut(page);

    await login(page, shop.ownerUsername, shop.ownerPassword);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("wrong password shows an inline error and does not sign in", async ({ page }) => {
    const shop = await onboardShop(page, "Bad Login Test");
    await signOut(page);

    await login(page, shop.ownerUsername, "the-wrong-password");
    // Backend normalizes every login failure to the same message
    // (AuthService.login) so a bad password and a bad username look
    // identical — this asserts the frontend surfaces that message inline
    // rather than redirecting anywhere.
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
