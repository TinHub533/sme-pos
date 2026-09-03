package com.smepos.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    public enum Status { OPEN, PAID, VOID }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(name = "cashier_id", nullable = false)
    private UUID cashierId;

    @Enumerated(EnumType.STRING)
    private Status status = Status.OPEN;

    private BigDecimal total = BigDecimal.ZERO;

    // Frozen at checkout time so a later fx-rate change never
    // rewrites the economics of a closed order.
    @Column(name = "fx_rate_snapshot")
    private BigDecimal fxRateSnapshot;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {}

    public Order(UUID shopId, UUID cashierId) {
        this.shopId = shopId;
        this.cashierId = cashierId;
    }

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public UUID getCashierId() { return cashierId; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public BigDecimal getFxRateSnapshot() { return fxRateSnapshot; }
    public void setFxRateSnapshot(BigDecimal fxRateSnapshot) { this.fxRateSnapshot = fxRateSnapshot; }
    public Instant getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }
}
