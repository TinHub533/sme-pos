package com.smepos.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class DashboardDtos {

    public record LowStockItem(UUID productId, String productName, int qtyOnHand, int reorderThreshold) {}

    public record DashboardSummary(
            BigDecimal todaySalesTotal,
            long todayOrderCount,
            List<LowStockItem> lowStock
    ) {}
}
