import crypto from "node:crypto";
import { test, expect, request } from "@playwright/test";

// A bank webhook is inherently a server-to-server call, not a browser
// action — there's no "click" that represents "the bank calls us back", so
// this drives the backend directly via Playwright's API request context
// rather than through the UI.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
// Matches application.yml's khqr.webhook-secret default. If the backend
// under test overrides KHQR_WEBHOOK_SECRET, override this the same way.
const WEBHOOK_SECRET = process.env.KHQR_WEBHOOK_SECRET ?? "change-this-in-prod-to-a-real-shared-secret";

function sign(body: string): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

test.describe("gateway KHQR", () => {
  test("webhook confirms payment; wrong signature is rejected; failure surfaces on the order", async () => {
    const api = await request.newContext();
    const stamp = Date.now();
    const username = `gateway_test_${stamp}`;

    const onboard = await api.post(`${BACKEND_URL}/onboarding/shop`, {
      data: {
        shopName: `Gateway Test ${stamp}`,
        currencyDefault: "USD",
        ownerUsername: username,
        ownerPassword: "password123",
        ownerName: "Owner",
      },
    });
    expect(onboard.ok()).toBeTruthy();
    const { token } = await onboard.json();
    const auth = { Authorization: `Bearer ${token}` };

    const product = await api.post(`${BACKEND_URL}/products`, {
      headers: auth,
      data: { sku: "GW-SKU", name: "Gateway Widget", priceUsd: 5.0, initialQty: 10 },
    });
    const productId = (await product.json()).id;

    const order = await api.post(`${BACKEND_URL}/orders`, { headers: auth });
    const orderId = (await order.json()).id;
    await api.post(`${BACKEND_URL}/orders/${orderId}/items`, {
      headers: auth,
      data: { productId, qty: 1 },
    });

    // KHR checkout: verifies the amount is actually converted (5 USD *
    // the configured rate), not the raw USD figure mislabeled as KHR.
    const checkout = await api.post(`${BACKEND_URL}/orders/${orderId}/checkout`, {
      headers: auth,
      data: { method: "KHQR", currency: "KHR" },
    });
    expect(checkout.ok()).toBeTruthy();
    const quote = await checkout.json();
    expect(quote.khqrRef).toBeTruthy();
    expect(quote.qrPayload).toContain("amount=20500KHR"); // 5.00 * 4100 (default rate)

    const body = JSON.stringify({ khqrRef: quote.khqrRef, bankStatus: "SUCCESS" });

    // Wrong signature must be rejected, and must not touch the order.
    const badSig = await api.post(`${BACKEND_URL}/webhooks/khqr/payment-confirm`, {
      headers: { "X-Khqr-Signature": "not-the-right-signature" },
      data: body,
    });
    expect(badSig.status()).toBe(401);

    let current = await (await api.get(`${BACKEND_URL}/orders/${orderId}`, { headers: auth })).json();
    expect(current.status).toBe("OPEN");
    expect(current.paymentStatus).toBe("PENDING");

    // Correct signature confirms the payment and flips the order to PAID.
    const goodSig = await api.post(`${BACKEND_URL}/webhooks/khqr/payment-confirm`, {
      headers: { "X-Khqr-Signature": sign(body) },
      data: body,
    });
    expect(goodSig.ok()).toBeTruthy();

    current = await (await api.get(`${BACKEND_URL}/orders/${orderId}`, { headers: auth })).json();
    expect(current.status).toBe("PAID");
    expect(current.paymentStatus).toBe("CONFIRMED");

    // Replaying the same webhook must be a no-op, not a double-credit —
    // banks retry on timeout, so this has to be safe.
    const replay = await api.post(`${BACKEND_URL}/webhooks/khqr/payment-confirm`, {
      headers: { "X-Khqr-Signature": sign(body) },
      data: body,
    });
    expect(replay.ok()).toBeTruthy();
    expect(await replay.text()).toContain("already confirmed");
  });

  test("declined payment marks the order's paymentStatus FAILED but leaves it OPEN for retry", async () => {
    const api = await request.newContext();
    const stamp = Date.now();
    const username = `gateway_fail_${stamp}`;

    const onboard = await api.post(`${BACKEND_URL}/onboarding/shop`, {
      data: {
        shopName: `Gateway Fail Test ${stamp}`,
        currencyDefault: "USD",
        ownerUsername: username,
        ownerPassword: "password123",
        ownerName: "Owner",
      },
    });
    const { token } = await onboard.json();
    const auth = { Authorization: `Bearer ${token}` };

    const product = await api.post(`${BACKEND_URL}/products`, {
      headers: auth,
      data: { sku: "GW-FAIL-SKU", name: "Gateway Fail Widget", priceUsd: 2.0, initialQty: 5 },
    });
    const productId = (await product.json()).id;
    const order = await api.post(`${BACKEND_URL}/orders`, { headers: auth });
    const orderId = (await order.json()).id;
    await api.post(`${BACKEND_URL}/orders/${orderId}/items`, { headers: auth, data: { productId, qty: 1 } });
    const checkout = await api.post(`${BACKEND_URL}/orders/${orderId}/checkout`, {
      headers: auth,
      data: { method: "KHQR", currency: "USD" },
    });
    const { khqrRef } = await checkout.json();

    const body = JSON.stringify({ khqrRef, bankStatus: "DECLINED" });
    const res = await api.post(`${BACKEND_URL}/webhooks/khqr/payment-confirm`, {
      headers: { "X-Khqr-Signature": sign(body) },
      data: body,
    });
    expect(res.ok()).toBeTruthy();

    const current = await (await api.get(`${BACKEND_URL}/orders/${orderId}`, { headers: auth })).json();
    expect(current.status).toBe("OPEN"); // not voided — the cashier can retry
    expect(current.paymentStatus).toBe("FAILED");
  });

  test("a webhook with no khqrRef is rejected cleanly, not a 500", async () => {
    const api = await request.newContext();
    const body = JSON.stringify({ khqrRef: null, bankStatus: "SUCCESS" });
    const res = await api.post(`${BACKEND_URL}/webhooks/khqr/payment-confirm`, {
      headers: { "X-Khqr-Signature": sign(body) },
      data: body,
    });
    expect(res.status()).toBe(400);
  });
});
