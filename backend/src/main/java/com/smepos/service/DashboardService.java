package com.smepos.service;

import com.smepos.dto.DashboardDtos.DashboardSummary;
import com.smepos.dto.DashboardDtos.LowStockItem;
import com.smepos.entity.Inventory;
import com.smepos.entity.Order;
import com.smepos.repository.InventoryRepository;
import com.smepos.repository.OrderRepository;
import com.smepos.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@Service
public class DashboardService {

    private final OrderRepository orderRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    public DashboardService(OrderRepository orderRepository, InventoryRepository inventoryRepository,
                             ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
    }

    /**
     * "Today" is computed in a fixed zone rather than the server's default
     * zone, since a Cambodia-market POS should always mean Asia/Phnom_Penh
     * midnight, not whatever timezone the app server happens to be
     * deployed in. Hardcoded for now — worth lifting to a per-shop setting
     * if this ever serves shops outside Cambodia.
     */
    public DashboardSummary getSummary(UUID shopId) {
        ZoneId zone = ZoneId.of("Asia/Phnom_Penh");
        LocalDate today = LocalDate.now(zone);
        Instant start = today.atStartOfDay(zone).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();

        var paidTotal = orderRepository.sumTotalByStatus(shopId, Order.Status.PAID, start, end);
        var todaysOrders = orderRepository.findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(shopId, start, end);
        long paidCount = todaysOrders.stream().filter(o -> o.getStatus() == Order.Status.PAID).count();

        var lowStock = inventoryRepository.findLowStockByShop(shopId).stream()
                .map(this::toLowStockItem)
                .toList();

        return new DashboardSummary(paidTotal, paidCount, lowStock);
    }

    private LowStockItem toLowStockItem(Inventory inv) {
        String name = productRepository.findById(inv.getProductId())
                .map(com.smepos.entity.Product::getName)
                .orElse("(unknown product)");
        return new LowStockItem(inv.getProductId(), name, inv.getQtyOnHand(), inv.getReorderThreshold());
    }
}
