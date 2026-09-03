import type { Page } from "@playwright/test";

export interface OnboardedShop {
  shopName: string;
  ownerUsername: string;
  ownerPassword: string;
}

// Every test onboards its own fresh shop rather than sharing fixtures —
// these run against a real Postgres database with no reset between runs,
// so a unique timestamped username per test is what keeps tests from
// colliding with each other (or with prior runs) instead of a DB reset step.
export async function onboardShop(page: Page, label: string): Promise<OnboardedShop> {
  const stamp = Date.now();
  const shop: OnboardedShop = {
    shopName: `${label} ${stamp}`,
    ownerUsername: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${stamp}`,
    ownerPassword: "password123",
  };

  await page.goto("/onboarding");
  await page.fill("#shopName", shop.shopName);
  await page.fill("#ownerName", "Test Owner");
  await page.fill("#ownerUsername", shop.ownerUsername);
  await page.fill("#ownerPassword", shop.ownerPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  return shop;
}

export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
}

export async function signOut(page: Page): Promise<void> {
  await page.click('button:has-text("Sign out")');
  await page.waitForURL("**/login");
}
