import { test, expect } from "@playwright/test";
import { onboardShop } from "./helpers";

// BANK: the customer scanned the shop's own physical/counter QR (nothing
// shown in this app) and showed the cashier proof of payment. One click,
// same shape as Cash, but tracked as its own Payment.Method so cash-in-
// drawer and bank-transfer revenue can still be told apart later.
test("bank checkout: ring up a product, one click, order shows PAID immediately", async ({ page }) => {
  await onboardShop(page, "Bank Checkout Test");

  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).click();
  await page.fill("#sku", "BANK-WIDGET");
  await page.fill("#name", "Bank Widget");
  await page.fill("#priceUsd", "4.00");
  await page.fill("#initialQty", "10");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Bank Widget")).toBeVisible();

  await page.goto("/pos");
  await page.getByTestId("product-card-BANK-WIDGET").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("1 item")).toBeVisible();

  await page.getByRole("button", { name: "Pay by bank" }).click();
  await expect(page.getByText(/^Paid —/)).toBeVisible();

  await page.goto("/products");
  const row = page.locator("tr", { has: page.getByText("BANK-WIDGET") });
  await expect(row.getByText("9", { exact: true })).toBeVisible(); // 10 - 1 sold

  await page.goto("/orders");
  await expect(page.locator("tbody tr").first()).toContainText("PAID");
});
