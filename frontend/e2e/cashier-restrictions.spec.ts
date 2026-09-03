import { test, expect } from "@playwright/test";
import { onboardShop, login, signOut } from "./helpers";

// Matches each controller's real @PreAuthorize, not a guess: Staff and
// Daily-closing are OWNER-only on the backend, so a Cashier should never
// reach those pages or see the owner-only mutation controls on Products.
test("cashier cannot reach owner-only pages or actions", async ({ page }) => {
  await onboardShop(page, "Cashier Restrict Test");

  const cashierUsername = `cashier_restrict_${Date.now()}`;
  await page.goto("/staff");
  await page.getByRole("button", { name: "Add cashier" }).click();
  await page.fill("form input#name", "Test Cashier");
  await page.fill("form input#username", cashierUsername);
  await page.fill("form input#password", "password123");
  await page.getByRole("button", { name: "Create cashier" }).click();
  await expect(page.getByText(cashierUsername)).toBeVisible();

  await signOut(page);
  await login(page, cashierUsername, "password123");
  await expect(page).toHaveURL(/\/pos$/);

  await page.goto("/closing");
  await expect(page).toHaveURL(/\/pos$/);

  await page.goto("/staff");
  await expect(page).toHaveURL(/\/pos$/);

  await page.goto("/products");
  await expect(page).toHaveURL(/\/products$/); // this page itself stays reachable...
  await expect(page.getByRole("button", { name: "Add product" })).toHaveCount(0); // ...but the mutation control is gone

  await page.goto("/orders");
  await expect(page).toHaveURL(/\/orders$/); // also reachable — no role restriction on the backend
});
