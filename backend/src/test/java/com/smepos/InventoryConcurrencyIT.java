package com.smepos;

import com.smepos.entity.*;
import com.smepos.repository.*;
import com.smepos.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves the pessimistic-lock decrement path in InventoryService actually
 * prevents overselling under concurrency, rather than just trusting that
 * SELECT ... FOR UPDATE does what the docs say. This is the test that
 * would have caught the lockForUpdate()-outside-a-transaction bug class
 * before it ever reached prod.
 *
 * Real Postgres via Testcontainers on purpose: H2's locking semantics
 * don't match Postgres closely enough to trust this kind of test against
 * an in-memory DB.
 */
@Testcontainers
@SpringBootTest
class InventoryConcurrencyIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired InventoryService inventoryService;
    @Autowired InventoryRepository inventoryRepository;
    @Autowired ProductRepository productRepository;
    @Autowired ShopRepository shopRepository;
    @Autowired UserRepository userRepository;

    UUID productId;
    UUID actorId;

    @BeforeEach
    void setUp() {
        Shop shop = shopRepository.save(new Shop("Test Shop", "USD"));
        AppUser user = userRepository.save(
                new AppUser(shop.getId(), "tester-" + UUID.randomUUID(), "hash", "Tester", Role.CASHIER));
        Product product = productRepository.save(
                new Product(shop.getId(), "SKU-1", "Test Product", null, BigDecimal.TEN, "misc"));
        inventoryRepository.save(new Inventory(product.getId(), 10, 0)); // exactly 10 in stock

        this.productId = product.getId();
        this.actorId = user.getId();
    }

    @Test
    void concurrentSalesNeverOversellStock() throws InterruptedException {
        int threads = 20; // 20 threads each trying to sell 1 unit, only 10 in stock
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger(0);
        AtomicInteger rejected = new AtomicInteger(0);

        List<Future<?>> futures = java.util.stream.IntStream.range(0, threads).<Future<?>>mapToObj(i -> pool.submit(() -> {
            try {
                startGate.await();
                inventoryService.decrementForSale(productId, 1, actorId);
                succeeded.incrementAndGet();
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                rejected.incrementAndGet(); // InsufficientStockException, expected for the losers
            }
        })).toList();

        startGate.countDown(); // release all threads at once to maximize contention
        for (Future<?> f : futures) {
            try { f.get(10, TimeUnit.SECONDS); } catch (Exception ignored) {}
        }
        pool.shutdown();

        Inventory finalState = inventoryRepository.findByProductId(productId).orElseThrow();

        assertEquals(10, succeeded.get(), "exactly 10 of the 20 concurrent sales should succeed");
        assertEquals(10, rejected.get(), "the other 10 should be rejected as insufficient stock");
        assertEquals(0, finalState.getQtyOnHand(), "stock must land at exactly 0, never negative");
        assertTrue(finalState.getQtyOnHand() >= 0, "stock must never go negative under contention");
    }

}
