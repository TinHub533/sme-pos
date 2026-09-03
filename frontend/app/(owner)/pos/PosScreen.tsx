"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import type { KhqrCheckoutResponse, OrderResponse, ProductResponse } from "@/lib/types";
import { formatKhr, formatUsd } from "@/lib/money";
import { Badge, Button, Card, ErrorAlert } from "@/components/ui";
import { ApiRequestError, apiRequest } from "@/lib/clientFetch";

// Bank webhook confirmation can land any time after the QR is shown — this
// is how long we wait between checks while it's outstanding. No backend
// endpoint exists (or is needed) beyond GET /orders/{id}; the order just
// flips OPEN -> PAID once PaymentWebhookController processes the payment.
const POLL_INTERVAL_MS = 3000;

export default function PosScreen({ initialProducts }: { initialProducts: ProductResponse[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [khqr, setKhqr] = useState<KhqrCheckoutResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startNewSale = useCallback(async () => {
    setStarting(true);
    setError(null);
    setKhqr(null);
    setQrDataUrl(null);
    try {
      const created = await apiRequest<OrderResponse>("/api/orders", { method: "POST" }, "Could not start a new sale");
      setOrder(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new sale");
    } finally {
      setStarting(false);
    }
  }, []);

  // Auto-start the first sale of the session so the cashier lands on a
  // ready-to-scan/ready-to-sell screen, not an empty one.
  useEffect(() => {
    if (!order) startNewSale();
  }, [order, startNewSale]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function addToCart(productId: string) {
    if (!order) return;
    const qty = Number(qtyInputs[productId] || "1");
    if (!Number.isFinite(qty) || qty <= 0) return;

    setBusyProductId(productId);
    setError(null);
    try {
      const updated = await apiRequest<OrderResponse>(
        `/api/orders/${order.id}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, qty }),
        },
        "Could not add item",
      );
      setOrder(updated);
      setProducts((ps) => ps.map((p) => (p.id === productId ? { ...p, qtyOnHand: p.qtyOnHand - qty } : p)));
      setQtyInputs((q) => ({ ...q, [productId]: "1" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setBusyProductId(null);
    }
  }

  async function checkoutCash() {
    if (!order) return;
    setCheckingOut(true);
    setError(null);
    try {
      const paid = await apiRequest<OrderResponse>(
        `/api/orders/${order.id}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "CASH" }),
        },
        "Checkout failed",
      );
      setOrder(paid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  // The customer scanned the shop's own physical/counter QR (nothing shown
  // in this app) and showed the cashier proof of payment on their phone —
  // same one-click, cashier-verified flow as checkoutCash, just tracked as
  // its own payment method so cash-in-drawer and bank-transfer revenue can
  // still be told apart later.
  async function checkoutBank() {
    if (!order) return;
    setCheckingOut(true);
    setError(null);
    try {
      const paid = await apiRequest<OrderResponse>(
        `/api/orders/${order.id}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "BANK" }),
        },
        "Checkout failed",
      );
      setOrder(paid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  async function checkoutKhqr() {
    if (!order) return;
    setCheckingOut(true);
    setError(null);
    try {
      const quote = await apiRequest<KhqrCheckoutResponse>(
        `/api/orders/${order.id}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "KHQR", currency }),
        },
        "Checkout failed",
      );
      setKhqr(quote);
      setQrDataUrl(await QRCode.toDataURL(quote.qrPayload, { margin: 1, width: 220 }));

      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const latest = await apiRequest<OrderResponse>(`/api/orders/${order.id}`, undefined, "Could not check payment status");
          // FAILED stops the poll same as PAID does — otherwise a declined
          // payment just polls silently forever with the cashier never told
          // anything went wrong.
          if (latest.status === "PAID" || latest.paymentStatus === "FAILED") {
            stopPolling();
            setOrder(latest);
          }
        } catch (pollErr) {
          // A 401 mid-poll means the session expired while waiting for
          // payment — apiRequest already redirected to /login, so just stop
          // polling. Any other error here is treated as transient (a
          // network blip, a slow backend) and silently retried on the next
          // tick, same as before this used apiRequest.
          if (pollErr instanceof ApiRequestError && pollErr.status === 401) {
            stopPolling();
          }
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  function cancelKhqrWait() {
    stopPolling();
    setKhqr(null);
    setQrDataUrl(null);
  }

  function setQty(productId: string, value: string) {
    setQtyInputs((q) => ({ ...q, [productId]: value }));
  }

  function stepQty(productId: string, delta: number) {
    const current = Number(qtyInputs[productId] || "1");
    const next = Math.max(1, (Number.isFinite(current) ? current : 1) + delta);
    setQty(productId, String(next));
  }

  const isPaid = order?.status === "PAID";
  const isOpen = order?.status === "OPEN";
  const paymentFailed = order?.paymentStatus === "FAILED";
  const cartCount = order?.items.reduce((n, i) => n + i.qty, 0) ?? 0;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">POS</h1>
          <div className="relative sm:w-72">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="m17 17-4-4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or SKU…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
        </div>

        <ErrorAlert>{error}</ErrorAlert>

        {filteredProducts.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-gray-500">
            {products.length === 0 ? "No products in the catalog yet." : "No products match your search."}
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => {
              const outOfStock = p.qtyOnHand <= 0;
              const lowStock = !outOfStock && p.qtyOnHand <= 5;
              // The backend can only price a sale in USD — ProductService's
              // currentPrice() throws if priceUsd is null, with no fallback
              // KHR->USD conversion anywhere server-side — so a product
              // priced only in KHR genuinely cannot be added to a cart yet.
              // Disable it here with an honest reason instead of letting the
              // cashier hit "Add" and get a 409 back.
              const unsellable = p.priceUsd == null;
              const qtyValue = qtyInputs[p.id] ?? "1";
              return (
                <Card key={p.id} data-testid={`product-card-${p.sku}`} className="flex flex-col gap-2.5 p-3.5">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">{p.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{p.sku}</p>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-base font-semibold text-gray-900">
                        {p.priceUsd != null ? formatUsd(p.priceUsd) : "—"}
                      </span>
                      {p.priceKhr != null && <span className="text-xs text-gray-500">{formatKhr(p.priceKhr)}</span>}
                    </span>
                    <Badge tone={unsellable ? "red" : outOfStock ? "red" : lowStock ? "amber" : "gray"}>
                      {unsellable ? "No USD price" : outOfStock ? "Out of stock" : `${p.qtyOnHand} on hand`}
                    </Badge>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <div className="flex items-center rounded-lg border border-gray-300">
                      <button
                        type="button"
                        onClick={() => stepQty(p.id, -1)}
                        disabled={!isOpen || unsellable}
                        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                        aria-label={`Decrease quantity for ${p.name}`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={qtyValue}
                        onChange={(e) => setQty(p.id, e.target.value)}
                        disabled={!isOpen || unsellable}
                        className="h-8 w-9 border-x border-gray-300 text-center text-sm [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => stepQty(p.id, 1)}
                        disabled={!isOpen || unsellable}
                        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                        aria-label={`Increase quantity for ${p.name}`}
                      >
                        +
                      </button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addToCart(p.id)}
                      disabled={!isOpen || busyProductId === p.id || outOfStock || unsellable}
                      className="flex-1"
                    >
                      {busyProductId === p.id ? "…" : "Add"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Current sale</h2>
            {cartCount > 0 && <Badge tone="brand">{cartCount} item{cartCount === 1 ? "" : "s"}</Badge>}
          </div>

          {!order ? (
            <p className="mt-2 text-sm text-gray-500">{starting ? "Starting…" : "No sale in progress."}</p>
          ) : (
            <>
              <ul className="mt-3 max-h-72 divide-y divide-gray-100 overflow-y-auto">
                {order.items.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-gray-700">
                      <span className="font-medium text-gray-900">{item.qty}×</span> {item.productName}
                    </span>
                    <span className="flex-shrink-0 text-gray-500">{formatUsd(item.lineTotal)}</span>
                  </li>
                ))}
                {order.items.length === 0 && <li className="py-2 text-sm text-gray-500">Cart is empty.</li>}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="font-medium text-gray-900">Total</span>
                <span className="text-xl font-semibold text-gray-900">{formatUsd(order.total)}</span>
              </div>

              {isPaid && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.9 3.9 6.7-6.7a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Paid — {order.id.slice(0, 8)}
                </p>
              )}
            </>
          )}
        </Card>

        {order && isOpen && order.items.length > 0 && !khqr && (
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold text-gray-900">Checkout</h2>

            <Button type="button" onClick={checkoutCash} disabled={checkingOut} size="lg" className="w-full">
              {checkingOut ? "…" : "Pay cash"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={checkoutBank}
              disabled={checkingOut}
              size="lg"
              className="w-full"
            >
              {checkingOut ? "…" : "Pay by bank"}
            </Button>

            <div className="flex items-center gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}
                className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              >
                <option value="USD">USD</option>
                <option value="KHR">KHR</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                onClick={checkoutKhqr}
                disabled={checkingOut}
                size="lg"
                className="flex-1"
              >
                {checkingOut ? "…" : "Pay with KHQR"}
              </Button>
            </div>
          </Card>
        )}

        {khqr && !isPaid && (
          <Card className="space-y-3 p-5 text-center">
            <h2 className="font-semibold text-gray-900">Scan to pay</h2>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="KHQR code" className="mx-auto rounded-lg border border-gray-100" />
            )}

            {paymentFailed ? (
              <p className="flex items-center justify-center gap-2 text-sm text-red-600">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.169 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.515-2.63L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                Payment failed or was declined — try again or choose another method.
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                Waiting for payment confirmation…
              </p>
            )}

            <button
              type="button"
              onClick={cancelKhqrWait}
              className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              Cancel and choose another method
            </button>
          </Card>
        )}

        {isPaid && order && (
          <div className="space-y-2">
            <Button type="button" onClick={startNewSale} disabled={starting} size="lg" className="w-full">
              {starting ? "…" : "New sale"}
            </Button>
            {/* New tab: printing shouldn't disturb the cashier's POS session
                underneath (cart state, "New sale" button, etc). */}
            <a
              href={`/orders/${order.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Print receipt
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
