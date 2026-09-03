export type Role = "ROLE_ADMIN" | "ROLE_OWNER" | "ROLE_CASHIER";

export interface Session {
  username: string;
  role: Role;
  shopId: string;
  exp: number; // unix seconds
}

export interface LowStockItem {
  productId: string;
  productName: string;
  qtyOnHand: number;
  reorderThreshold: number;
}

export interface DashboardSummary {
  todaySalesTotal: number;
  todayOrderCount: number;
  lowStock: LowStockItem[];
}

export interface ShopResponse {
  id: string;
  name: string;
  currencyDefault: string;
  active: boolean;
}

export interface ShopDetailResponse {
  id: string;
  name: string;
  currencyDefault: string;
  active: boolean;
  createdAt: string;
  ownerUsername: string | null;
  productCount: number;
  staffCount: number;
}

// Matches backend PageResponse<T> — used by any endpoint that paginates
// (currently GET /products and GET /orders).
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}

export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  priceKhr: number | null;
  priceUsd: number | null;
  category: string | null;
  qtyOnHand: number;
}

// productName is a snapshot taken when the item was added to the order —
// what the product was called at sale time, not necessarily its current name.
export interface OrderItemResponse {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

// paymentStatus is only ever populated by GET /orders/{id} (the POS poll
// loop for GATEWAY/KHQR orders) — see OrderController.toResponse's two-arg
// overload — null everywhere else (list/void/addItem/checkout).
export interface OrderResponse {
  id: string;
  status: "OPEN" | "PAID" | "VOID";
  total: number;
  items: OrderItemResponse[];
  paymentStatus: "PENDING" | "CONFIRMED" | "FAILED" | null;
}

// Plain "OWNER" / "CASHIER" — unlike Session.role, this isn't prefixed with
// ROLE_ (it comes straight from the entity's Role enum, not a JWT authority).
export interface StaffResponse {
  id: string;
  username: string;
  name: string;
  role: "OWNER" | "CASHIER";
}

export interface AdminUserResponse {
  id: string;
  username: string;
  name: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
}

export interface MfaEnrollResponse {
  secret: string;
  otpauthUri: string;
}

export interface AuditLogResponse {
  id: string;
  actorUsername: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface BootstrapStatusResponse {
  bootstrapped: boolean;
}

export interface KhqrCheckoutResponse {
  khqrRef: string;
  qrPayload: string;
  total: number;
}

export interface DailyClosingResponse {
  id: string;
  shopId: string;
  closingDate: string;
  totalSales: number;
  cashCounted: number | null;
  variance: number | null;
}

// paymentMethod is null for an order that was never checked out.
export interface ReceiptResponse {
  orderId: string;
  shopName: string;
  createdAt: string;
  cashierName: string;
  items: OrderItemResponse[];
  total: number;
  paymentMethod: "CASH" | "BANK" | "KHQR" | null;
  status: "OPEN" | "PAID" | "VOID";
}
