package com.smepos.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_closings")
public class DailyClosing {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(name = "closing_date", nullable = false)
    private LocalDate closingDate;

    @Column(name = "total_sales", nullable = false)
    private BigDecimal totalSales;

    @Column(name = "cash_counted")
    private BigDecimal cashCounted;

    // totalSales - cashCounted, for cash-drawer reconciliation. Null until
    // the cashier actually counts the drawer.
    private BigDecimal variance;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    protected DailyClosing() {}

    public DailyClosing(UUID shopId, LocalDate closingDate, BigDecimal totalSales) {
        this.shopId = shopId;
        this.closingDate = closingDate;
        this.totalSales = totalSales;
    }

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public LocalDate getClosingDate() { return closingDate; }
    public BigDecimal getTotalSales() { return totalSales; }
    public BigDecimal getCashCounted() { return cashCounted; }
    public BigDecimal getVariance() { return variance; }

    public void reconcile(BigDecimal cashCounted) {
        this.cashCounted = cashCounted;
        this.variance = cashCounted.subtract(this.totalSales);
    }

    /**
     * Refreshes totalSales as orders keep coming in during the day. If the
     * drawer was already reconciled, the previously-recorded variance is now
     * stale against the new total — recompute it against the same
     * cashCounted rather than leave a variance that no longer matches
     * totalSales.
     */
    public void updateTotalSales(BigDecimal totalSales) {
        this.totalSales = totalSales;
        if (this.cashCounted != null) {
            this.variance = this.cashCounted.subtract(this.totalSales);
        }
    }
}
