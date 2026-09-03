// Shared money formatting — was previously copy-pasted as a private
// formatMoney() in six different page/component files, USD-only.
//
// KHR must never be computed client-side by converting a USD amount: the
// backend has no exchange-rate service (ProductPriceLookup.currentPrice()
// in ProductService.java requires priceUsd and throws if it's null —
// there's no USD<->KHR conversion anywhere on the server), so an order's
// total is always genuinely a USD amount, and a product's priceKhr is
// always genuinely a separate value someone typed in, not a derived one.
// These helpers only format numbers that already exist — they never invent
// a KHR figure from a USD one or vice versa.

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatKhr(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KHR",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}
