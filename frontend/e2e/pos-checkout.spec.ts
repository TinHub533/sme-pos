import { test, expect } from "@playwright/test";
import { onboardShop } from "./helpers";

// The POS cash-checkout path is the highest-stakes screen in the app — it's
// the one that actually moves money and stock. Covers: creating a sellable
// product, adding it to a live cart, cash checkout flipping the order to
// PAID, stock decrementing, and the sale showing up on the Orders page.
test("cash checkout: ring up a product, stock decrements, order shows PAID", async ({ page }) => {
  await onboardShop(page, "Checkout Test");

  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).click();
  await page.fill("#sku", "TEST-WIDGET");
  await page.fill("#name", "Test Widget");
  await page.fill("#priceUsd", "2.50");
  await page.fill("#initialQty", "10");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Test Widget")).toBeVisible();

  await page.goto("/pos");
  const card = page.getByTestId("product-card-TEST-WIDGET");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("1 item")).toBeVisible();

  await page.getByRole("button", { name: "Pay cash" }).click();
  await expect(page.getByText(/^Paid —/)).toBeVisible();

  await page.goto("/products");
  const row = page.locator("tr", { has: page.getByText("TEST-WIDGET") });
  await expect(row.getByText("9", { exact: true })).toBeVisible(); // 10 - 1 sold

  await page.goto("/orders");
  await expect(page.locator("tbody tr").first()).toContainText("PAID");
  await expect(page.locator("tbody tr").first()).toContainText("$2.50");
});
