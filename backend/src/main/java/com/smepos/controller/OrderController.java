package com.smepos.controller;

import com.smepos.dto.OrderDtos.*;
import com.smepos.dto.PageResponse;
import com.smepos.entity.Order;
import com.smepos.entity.OrderItem;
import com.smepos.repository.PaymentRepository;
import com.smepos.security.CurrentUser;
import com.smepos.service.KhqrPaymentService;
import com.smepos.service.OrderService;
import com.smepos.util.Csv;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;
    private final PaymentRepository paymentRepository;

    public OrderController(OrderService orderService, PaymentRepository paymentRepository) {
        this.orderService = orderService;
        this.paymentRepository = paymentRepository;
    }

    @PostMapping
    public OrderResponse create() {
        Order order = orderService.createOrder(CurrentUser.shopId(), CurrentUser.userId());
        return toResponse(order);
    }

    @GetMapping("/{orderId}")
    public OrderResponse get(@PathVariable UUID orderId) {
        Order order = orderService.getById(orderId, CurrentUser.shopId());
        return toResponse(order, paymentStatusFor(orderId));
    }

    // Today's orders only, for now — no date-range filter yet, but paged so
    // a busy shop's order list doesn't come back as one unbounded response.
    @GetMapping
    public PageResponse<OrderResponse> listToday(
            @PageableDefault(size = 25, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        ZoneId zone = ZoneId.of("Asia/Phnom_Penh");
        LocalDate today = LocalDate.now(zone);
        Instant start = today.atStartOfDay(zone).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();
        Page<Order> page = orderService.listByShopAndDateRangePaged(CurrentUser.shopId(), start, end, pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    // A literal segment, not another {orderId} — Spring MVC prefers the
    // more specific pattern (verified live, not just assumed). Owner-only,
    // unlike the rest of this controller: reporting/back-office, not a
    // cashier task. Defaults to the trailing 30 days when from/to are
    // omitted, same convention as DailyClosingController's export.
    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        ZoneId zone = ZoneId.of("Asia/Phnom_Penh");
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now(zone);
        LocalDate fromDate = from != null ? LocalDate.parse(from) : toDate.minusDays(30);
        Instant start = fromDate.atStartOfDay(zone).toInstant();
        Instant end = toDate.plusDays(1).atStartOfDay(zone).toInstant();
        return Csv.download(orderService.exportCsv(CurrentUser.shopId(), start, end), "orders.csv");
    }

    @PostMapping("/{orderId}/items")
    public OrderResponse addItem(@PathVariable UUID orderId, @Valid @RequestBody AddItemRequest req) {
        Order order = orderService.addItem(orderId, CurrentUser.shopId(), req.productId(), req.qty(), CurrentUser.userId());
        return toResponse(order);
    }

    @PostMapping("/{orderId}/void")
    public OrderResponse voidOrder(@PathVariable UUID orderId) {
        return toResponse(orderService.voidOrder(orderId, CurrentUser.shopId(), CurrentUser.userId()));
    }

    @PostMapping("/{orderId}/checkout")
    public ResponseEntity<?> checkout(@PathVariable UUID orderId, @Valid @RequestBody CheckoutRequest req) {
        UUID shopId = CurrentUser.shopId();
        if ("CASH".equalsIgnoreCase(req.method())) {
            return ResponseEntity.ok(toResponse(orderService.checkoutCash(orderId, shopId)));
        }
        if ("BANK".equalsIgnoreCase(req.method())) {
            return ResponseEntity.ok(toResponse(orderService.checkoutBank(orderId, shopId)));
        }
        if ("KHQR".equalsIgnoreCase(req.method())) {
            if (req.currency() == null) {
                return ResponseEntity.badRequest().body("currency is required for KHQR checkout");
            }
            KhqrPaymentService.KhqrQuote quote = orderService.checkoutKhqr(orderId, shopId, req.currency());
            Order order = orderService.getById(orderId, shopId);
            return ResponseEntity.ok(new KhqrCheckoutResponse(quote.khqrRef(), quote.qrPayload(), order.getTotal()));
        }
        return ResponseEntity.badRequest().body("unknown payment method: " + req.method());
    }

    private OrderResponse toResponse(Order order) {
        return toResponse(order, null);
    }

    private OrderResponse toResponse(Order order, String paymentStatus) {
        var items = order.getItems().stream()
                .map(this::toItemResponse)
                .toList();
        return new OrderResponse(order.getId(), order.getStatus().name(), order.getTotal(), items, paymentStatus);
    }

    private String paymentStatusFor(UUID orderId) {
        return paymentRepository.findByOrderId(orderId)
                .map(p -> p.getStatus().name())
                .orElse(null);
    }

    // No status restriction on the endpoint itself (see
    // OrderService.getReceipt's comment) — the frontend only shows a "Print
    // receipt" action for PAID orders, but the data is available for any.
    @GetMapping("/{orderId}/receipt")
    public ReceiptResponse receipt(@PathVariable UUID orderId) {
        OrderService.Receipt receipt = orderService.getReceipt(orderId, CurrentUser.shopId());
        Order order = receipt.order();
        var items = order.getItems().stream().map(this::toItemResponse).toList();
        return new ReceiptResponse(order.getId(), receipt.shopName(), order.getCreatedAt(), receipt.cashierName(),
                items, order.getTotal(), receipt.paymentMethod(), order.getStatus().name());
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        return new OrderItemResponse(item.getProductId(), item.getProductNameSnapshot(), item.getQty(),
                item.getUnitPriceSnapshot(), item.lineTotal());
    }
}
