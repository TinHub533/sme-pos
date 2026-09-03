import { apiFetch, ApiError } from "@/lib/api";
import type { ReceiptResponse } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { Badge, Card, ErrorAlert } from "@/components/ui";
import PrintButton from "./PrintButton";

function paymentMethodLabel(method: ReceiptResponse["paymentMethod"]): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "BANK":
      return "Bank transfer";
    case "KHQR":
      return "KHQR";
    default:
      return "—";
  }
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function ReceiptPage({ params }: { params: { orderId: string } }) {
  let receipt: ReceiptResponse | null = null;
  let loadError: string | null = null;

  try {
    receipt = await apiFetch<ReceiptResponse>(`/orders/${params.orderId}/receipt`);
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load this receipt";
  }

  return (
    // print:max-w-full: on screen this stays a neat max-w-sm card, but a
    // fixed 384px cap could actually be WIDER than a real 80mm (or 58mm)
    // thermal roll's printable area — letting it fill whatever page width
    // the printer/paper actually resolves to is what makes it correct on
    // both a narrow roll and a full sheet, not a fixed width either way.
    <div className="mx-auto max-w-sm space-y-4 print:max-w-full">
      <a
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 print:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12.5 15 7.5 10l5-5" />
        </svg>
        All orders
      </a>

      <ErrorAlert>{loadError}</ErrorAlert>

      {receipt && (
        <>
          <Card className="p-6 print:border-0 print:p-2 print:shadow-none">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">{receipt.shopName}</h1>
              <p className="mt-1 text-xs text-gray-500">{formatDateTime(receipt.createdAt)}</p>
              <p className="text-xs text-gray-500">
                Order {receipt.orderId.slice(0, 8)} · Served by {receipt.cashierName}
              </p>
              {receipt.status !== "PAID" && (
                <Badge tone={receipt.status === "VOID" ? "gray" : "amber"} className="mt-2">
                  {receipt.status}
                </Badge>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-dashed border-gray-300 pt-4">
              {receipt.items.map((item) => (
                <div key={item.productId} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-700">
                    <span className="font-medium text-gray-900">{item.qty}×</span> {item.productName}
                  </span>
                  <span className="flex-shrink-0 text-gray-700">{formatUsd(item.lineTotal)}</span>
                </div>
              ))}
              {receipt.items.length === 0 && <p className="text-sm text-gray-500">No items.</p>}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-4">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-semibold text-gray-900">{formatUsd(receipt.total)}</span>
            </div>

            <p className="mt-2 text-center text-sm text-gray-500">
              Paid by {paymentMethodLabel(receipt.paymentMethod)}
            </p>

            <p className="mt-5 text-center text-xs text-gray-400">Thank you!</p>
          </Card>

          <PrintButton />
        </>
      )}
    </div>
  );
}
