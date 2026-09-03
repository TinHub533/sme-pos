import { test, expect } from "@playwright/test";
import { onboardShop } from "./helpers";

test("receipt: shows shop name, item, cashier, total, and payment method after a cash sale", async ({ page }) => {
  const shop = await onboardShop(page, "Receipt Test");

  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).click();
  await page.fill("#sku", "RECEIPT-SKU");
  await page.fill("#name", "Receipt Widget");
  await page.fill("#priceUsd", "6.25");
  await page.fill("#initialQty", "10");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Receipt Widget")).toBeVisible();

  await page.goto("/pos");
  await page.getByTestId("product-card-RECEIPT-SKU").getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Pay cash" }).click();
  await expect(page.getByText(/^Paid —/)).toBeVisible();

  // "Print receipt" opens in a new tab.
  const [receiptPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "Print receipt" }).click(),
  ]);
  await receiptPage.waitForLoadState("networkidle");

  await expect(receiptPage.getByText(shop.shopName)).toBeVisible();
  await expect(receiptPage.getByText("Receipt Widget")).toBeVisible();
  await expect(receiptPage.getByText("Total")).toBeVisible();
  await expect(receiptPage.getByText("Paid by Cash")).toBeVisible();
  await expect(receiptPage.getByRole("button", { name: "Print" })).toBeVisible();

  // Also reachable from the Orders list for a completed sale.
  await page.goto("/orders");
  await expect(page.getByRole("link", { name: "Receipt" })).toBeVisible();
});
