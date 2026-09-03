package com.smepos.service;

import com.smepos.entity.AppUser;
import com.smepos.entity.Order;
import com.smepos.entity.OrderItem;
import com.smepos.entity.Payment;
import com.smepos.entity.Shop;
import com.smepos.repository.OrderRepository;
import com.smepos.repository.PaymentRepository;
import com.smepos.repository.ShopRepository;
import com.smepos.repository.UserRepository;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final InventoryService inventoryService;
    private final KhqrPaymentService khqrPaymentService;
    private final ProductPriceLookup productPriceLookup;

    public OrderService(OrderRepository orderRepository,
                         PaymentRepository paymentRepository,
                         ShopRepository shopRepository,
                         UserRepository userRepository,
                         InventoryService inventoryService,
                         KhqrPaymentService khqrPaymentService,
                         ProductPriceLookup productPriceLookup) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.inventoryService = inventoryService;
        this.khqrPaymentService = khqrPaymentService;
        this.productPriceLookup = productPriceLookup;
    }

    @Transactional
    public Order createOrder(UUID shopId, UUID cashierId) {
        return orderRepository.save(new Order(shopId, cashierId));
    }

    /**
     * Adds a line item and decrements stock. The decrement runs in its own
     * REQUIRES_NEW transaction inside InventoryService, so the row lock is
     * held only for that call — not for this whole method. Tradeoff: if
     * this outer transaction rolls back after the decrement already
     * committed (e.g. a later validation error), the stock change does NOT
     * automatically undo. That's an accepted gap for now — the compensating
     * action would be an explicit inventoryService.restock() call in a
     * catch block, which isn't wired up yet since no caller currently fails
     * after the decrement step. Worth flagging if this method grows more
     * steps after the decrement.
     */
    @Transactional
    public Order addItem(UUID orderId, UUID shopId, UUID productId, int qty, UUID actorId) {
        Order order = requireOrderInShop(orderId, shopId);

        if (order.getStatus() != Order.Status.OPEN) {
            throw new IllegalStateException("Cannot add items to an order in status " + order.getStatus());
        }

        ProductPriceLookup.Snapshot snapshot = productPriceLookup.currentSnapshot(productId);

        inventoryService.decrementForSale(productId, qty, actorId);

        OrderItem item = new OrderItem(order, productId, qty, snapshot.price(), snapshot.name());
        order.getItems().add(item);
        order.setTotal(order.getTotal().add(item.lineTotal()));

        return orderRepository.save(order);
    }

    @Transactional
    public Order checkoutCash(UUID orderId, UUID shopId) {
        Order order = getOpenOrder(orderId, shopId);
        Payment payment = new Payment(orderId, Payment.Method.CASH, null);
        payment.setStatus(Payment.Status.CONFIRMED);
        paymentRepository.save(payment);
        order.setStatus(Order.Status.PAID);
        return orderRepository.save(order);
    }

    /**
     * BANK: the customer scanned the shop's own physical/counter QR code
     * (not shown anywhere in this app) and showed the cashier proof of
     * payment on their phone. Same trust model and same one-click flow as
     * checkoutCash — kept as its own Payment.Method rather than folded into
     * CASH so cash-in-drawer and bank-transfer revenue can still be told
     * apart later (see the V3 migration comment for why that split matters).
     */
    @Transactional
    public Order checkoutBank(UUID orderId, UUID shopId) {
        Order order = getOpenOrder(orderId, shopId);
        Payment payment = new Payment(orderId, Payment.Method.BANK, null);
        payment.setStatus(Payment.Status.CONFIRMED);
        paymentRepository.save(payment);
        order.setStatus(Order.Status.PAID);
        return orderRepository.save(order);
    }

    @Transactional
    public KhqrPaymentService.KhqrQuote checkoutKhqr(UUID orderId, UUID shopId, String currency) {
        Order order = getOpenOrder(orderId, shopId);
        KhqrPaymentService.KhqrQuote quote = khqrPaymentService.generateQr(orderId, order.getTotal(), currency);

        Payment payment = new Payment(orderId, Payment.Method.KHQR, quote.khqrRef());
        payment.setStatus(Payment.Status.PENDING);
        paymentRepository.save(payment);

        return quote;
    }

    @Transactional
    public Order voidOrder(UUID orderId, UUID shopId, UUID actorId) {
        Order order = requireOrderInShop(orderId, shopId);

        if (order.getStatus() == Order.Status.VOID) {
            return order; // idempotent
        }

        // Compensating action: give back everything this order took out.
        for (OrderItem item : order.getItems()) {
            inventoryService.restock(item.getProductId(), item.getQty(), actorId, "order " + orderId + " voided");
        }

        order.setStatus(Order.Status.VOID);
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public Order getOpenOrder(UUID orderId, UUID shopId) {
        Order order = requireOrderInShop(orderId, shopId);
        if (order.getStatus() != Order.Status.OPEN) {
            throw new IllegalStateException("Order is not open: " + orderId);
        }
        return order;
    }

    @Transactional(readOnly = true)
    public Order getById(UUID orderId, UUID shopId) {
        return requireOrderInShop(orderId, shopId);
    }

    public record Receipt(Order order, String shopName, String cashierName, String paymentMethod) {}

    // No status restriction here on purpose — an Owner may still want to
    // look up the receipt for a VOID or (rarely) still-OPEN order for their
    // own records, even though the frontend only ever surfaces a "Print
    // receipt" action for PAID ones.
    @Transactional(readOnly = true)
    public Receipt getReceipt(UUID orderId, UUID shopId) {
        Order order = requireOrderInShop(orderId, shopId);
        String shopName = shopRepository.findById(shopId).map(Shop::getName).orElse("");
        String cashierName = userRepository.findById(order.getCashierId())
                .map(AppUser::getName)
                .orElse("(unknown)");
        String paymentMethod = paymentRepository.findByOrderId(orderId)
                .map(p -> p.getMethod().name())
                .orElse(null);
        return new Receipt(order, shopName, cashierName, paymentMethod);
    }

    @Transactional(readOnly = true)
    public Page<Order> listByShopAndDateRangePaged(UUID shopId, Instant start, Instant end, Pageable pageable) {
        Page<Order> page = orderRepository.findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(shopId, start, end, pageable);
        page.forEach(o -> Hibernate.initialize(o.getItems()));
        return page;
    }

    // Unpaged, unlike the listing endpoint above — an export needs every
    // matching order, not one page of them.
    @Transactional(readOnly = true)
    public byte[] exportCsv(UUID shopId, Instant start, Instant end) {
        StringBuilder sb = new StringBuilder();
        sb.append(com.smepos.util.Csv.row("Order ID", "Created at", "Status", "Items", "Total"));
        for (Order o : orderRepository.findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(shopId, start, end)) {
            int itemCount = o.getItems().stream().mapToInt(OrderItem::getQty).sum();
            sb.append(com.smepos.util.Csv.row(o.getId(), o.getCreatedAt(), o.getStatus(), itemCount, o.getTotal()));
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Every order lookup goes through here. Deliberately throws the same
     * IllegalArgumentException (-> 404 via GlobalExceptionHandler) for both
     * "no such order" and "order belongs to another shop" — a 403 or a
     * different message would confirm to a caller that the ID exists but
     * isn't theirs, which is its own small information leak. From the
     * caller's side, an order outside their shop should be indistinguishable
     * from one that was never created.
     */
    private Order requireOrderInShop(UUID orderId, UUID shopId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getShopId().equals(shopId)) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }
        // open-in-view is off, so the session closes the moment the calling
        // @Transactional method returns. Force-loading items here — while
        // the session is still open — is what lets OrderController safely
        // serialize order.getItems() afterwards instead of blowing up with
        // LazyInitializationException.
        Hibernate.initialize(order.getItems());
        return order;
    }

    public interface ProductPriceLookup {
        Snapshot currentSnapshot(UUID productId);
        record Snapshot(BigDecimal price, String name) {}
    }
}
