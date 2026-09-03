package com.smepos.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class OrderDtos {

    public record AddItemRequest(
            @NotNull UUID productId,
            @Positive int qty
    ) {}

    public record CheckoutRequest(
            @NotNull String method,   // "CASH", "BANK", or "KHQR"
            String currency           // required for KHQR
    ) {}

    // productName is a snapshot taken when the item was added (see
    // OrderItem.productNameSnapshot) — it's what the product was called at
    // sale time, not necessarily its current name.
    public record OrderItemResponse(UUID productId, String productName, int qty, BigDecimal unitPrice, BigDecimal lineTotal) {}

    // paymentStatus is null except where it's actually consumed (GET
    // /{orderId}, used by the POS poll loop for GATEWAY/KHQR orders) — see
    // OrderController.toResponse's two-arg overload. Left null elsewhere
    // (list/void/addItem) rather than looked up on every order in the list
    // endpoint for a field nothing there reads.
    public record OrderResponse(
            UUID id,
            String status,
            BigDecimal total,
            List<OrderItemResponse> items,
            String paymentStatus
    ) {}

    public record KhqrCheckoutResponse(String khqrRef, String qrPayload, BigDecimal total) {}

    // paymentMethod is null for an order that hasn't been checked out yet
    // (still OPEN with no Payment row) — "CASH" | "BANK" | "KHQR" otherwise.
    public record ReceiptResponse(
            UUID orderId,
            String shopName,
            Instant createdAt,
            String cashierName,
            List<OrderItemResponse> items,
            BigDecimal total,
            String paymentMethod,
            String status
    ) {}
}
