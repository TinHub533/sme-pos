package com.smepos;

import com.smepos.controller.PaymentWebhookController;
import com.smepos.dto.AdminDtos.CreateAdminRequest;
import com.smepos.entity.*;
import com.smepos.repository.*;
import com.smepos.service.AdminUserService;
import com.smepos.service.KhqrPaymentService;
import com.smepos.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Three concurrency scenarios a sequential happy-path test can't catch:
 * double-checkout of the same order, a KHQR webhook replayed genuinely
 * simultaneously (not just sequentially, one-after-another), and two
 * concurrent /admin/bootstrap attempts. Real Postgres via Testcontainers,
 * same reasoning as InventoryConcurrencyIT — H2's locking semantics don't
 * match Postgres closely enough to trust this against an in-memory DB.
 */
@Testcontainers
@SpringBootTest
class CheckoutAndBootstrapConcurrencyIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderService orderService;
    @Autowired AdminUserService adminUserService;
    @Autowired PaymentWebhookController paymentWebhookController;
    @Autowired OrderRepository orderRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired ProductRepository productRepository;
    @Autowired InventoryRepository inventoryRepository;
    @Autowired ShopRepository shopRepository;
    @Autowired UserRepository userRepository;

    @Value("${khqr.webhook-secret}")
    String webhookSecret;

    UUID shopId;
    UUID cashierId;

    @BeforeEach
    void setUp() {
        Shop shop = shopRepository.save(new Shop("Concurrency Shop " + UUID.randomUUID(), "USD"));
        AppUser cashier = userRepository.save(
                new AppUser(shop.getId(), "cashier-" + UUID.randomUUID(), "hash", "Cashier", Role.CASHIER));
        this.shopId = shop.getId();
        this.cashierId = cashier.getId();
    }

    // payments.order_id is UNIQUE at the DB level — this proves that
    // constraint actually does its job under real concurrent checkout
    // attempts, not just that it exists in the migration.
    @Test
    void concurrentCheckoutsOnSameOrderOnlyOneSucceeds() throws Exception {
        Product product = productRepository.save(
                new Product(shopId, "SKU-CO", "Checkout Race Product", null, BigDecimal.TEN, "misc"));
        inventoryRepository.save(new Inventory(product.getId(), 5, 0));

        Order order = orderService.createOrder(shopId, cashierId);
        orderService.addItem(order.getId(), shopId, product.getId(), 1, cashierId);

        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger(0);
        AtomicInteger rejected = new AtomicInteger(0);

        // Alternate CASH/BANK to prove it's the same-order race being
        // closed, not just "one specific checkout method wins."
        List<Future<?>> futures = IntStream.range(0, threads).<Future<?>>mapToObj(i -> pool.submit(() -> {
            try {
                startGate.await();
                if (i % 2 == 0) {
                    orderService.checkoutCash(order.getId(), shopId);
                } else {
                    orderService.checkoutBank(order.getId(), shopId);
                }
                succeeded.incrementAndGet();
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                rejected.incrementAndGet(); // expected losers: already-PAID or unique-constraint violation
            }
        })).toList();

        startGate.countDown();
        for (Future<?> f : futures) {
            try { f.get(10, TimeUnit.SECONDS); } catch (Exception ignored) {}
        }
        pool.shutdown();

        assertEquals(1, succeeded.get(), "exactly one concurrent checkout on the same order should succeed");
        assertEquals(threads - 1, rejected.get(), "the rest must be rejected, not silently double-charge");

        Order finalOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(Order.Status.PAID, finalOrder.getStatus());
        assertTrue(paymentRepository.findByOrderId(order.getId()).isPresent(), "exactly one payment row must exist");
    }

    // The controller's own comment claims this is "checked and updated
    // inside a single transaction so two near-simultaneous retries can't
    // both pass the check before either writes." Prove that under genuine
    // concurrency, not just trust the comment — and assert on the only
    // thing that actually has to be true regardless of exactly how the
    // race resolves: correct, non-corrupted final state.
    @Test
    void concurrentWebhookRepliesForSameRefLeaveConsistentState() throws Exception {
        Product product = productRepository.save(
                new Product(shopId, "SKU-WH", "Webhook Race Product", null, BigDecimal.TEN, "misc"));
        inventoryRepository.save(new Inventory(product.getId(), 5, 0));

        Order order = orderService.createOrder(shopId, cashierId);
        orderService.addItem(order.getId(), shopId, product.getId(), 1, cashierId);
        KhqrPaymentService.KhqrQuote quote = orderService.checkoutKhqr(order.getId(), shopId, "USD");

        String body = "{\"khqrRef\":\"" + quote.khqrRef() + "\",\"bankStatus\":\"SUCCESS\"}";
        String signature = hmacHex(body, webhookSecret);

        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);

        List<Future<ResponseEntity<String>>> futures = IntStream.range(0, threads)
                .<Future<ResponseEntity<String>>>mapToObj(i -> pool.submit(() -> {
                    startGate.await();
                    return paymentWebhookController.confirmPayment(body, signature);
                })).toList();

        startGate.countDown();
        List<ResponseEntity<String>> results = new ArrayList<>();
        for (Future<ResponseEntity<String>> f : futures) {
            results.add(f.get(10, TimeUnit.SECONDS));
        }
        pool.shutdown();

        long confirmedReplies = results.stream().filter(r -> "confirmed".equals(r.getBody())).count();
        long alreadyConfirmedReplies = results.stream().filter(r -> "already confirmed".equals(r.getBody())).count();
        System.out.println("[webhook race] confirmed=" + confirmedReplies + " already-confirmed=" + alreadyConfirmedReplies
                + " (informational — the assertions below are what actually has to hold)");

        assertEquals(threads, confirmedReplies + alreadyConfirmedReplies,
                "every reply must be a recognized success outcome, no 500s from the race");

        Payment payment = paymentRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(Payment.Status.CONFIRMED, payment.getStatus());
        Order finalOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(Order.Status.PAID, finalOrder.getStatus());
    }

    // AdminUserService.bootstrap() previously had a plain
    // existsByRole(ADMIN) check with no locking — a classic
    // check-then-act race where concurrent requests could all see zero
    // admins and all succeed. Fixed with a Postgres advisory transaction
    // lock (see that method's comment); this test is what proves the fix
    // actually closes the race rather than just looking correct.
    @Test
    void concurrentBootstrapAttemptsOnlyOneSucceeds() throws Exception {
        int threads = 5;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger(0);
        AtomicInteger rejected = new AtomicInteger(0);

        List<Future<?>> futures = IntStream.range(0, threads).<Future<?>>mapToObj(i -> pool.submit(() -> {
            try {
                startGate.await();
                adminUserService.bootstrap(new CreateAdminRequest(
                        "boot_admin_" + i + "_" + UUID.randomUUID(), "password123", "Boot Admin " + i));
                succeeded.incrementAndGet();
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                rejected.incrementAndGet(); // expected losers: "admin already exists"
            }
        })).toList();

        startGate.countDown();
        for (Future<?> f : futures) {
            try { f.get(10, TimeUnit.SECONDS); } catch (Exception ignored) {}
        }
        pool.shutdown();

        assertEquals(1, succeeded.get(), "exactly one concurrent bootstrap attempt should succeed");
        assertEquals(threads - 1, rejected.get());
        assertEquals(1, userRepository.findByRoleOrderByCreatedAtAsc(Role.ADMIN).size(),
                "exactly one admin must exist after the race, never two");
    }

    private static String hmacHex(String body, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(hash.length * 2);
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
