package com.smepos.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    private Integer qty;

    // Snapshot, not a live FK join to Product.price — protects
    // historical order totals from later price edits.
    @Column(name = "unit_price_snapshot", nullable = false)
    private BigDecimal unitPriceSnapshot;

    // Same reasoning: a receipt should show what the product was called at
    // sale time, not its current name if it's since been renamed.
    @Column(name = "product_name_snapshot", nullable = false)
    private String productNameSnapshot;

    protected OrderItem() {}

    public OrderItem(Order order, UUID productId, Integer qty, BigDecimal unitPriceSnapshot, String productNameSnapshot) {
        this.order = order;
        this.productId = productId;
        this.qty = qty;
        this.unitPriceSnapshot = unitPriceSnapshot;
        this.productNameSnapshot = productNameSnapshot;
    }

    public UUID getId() { return id; }
    public Order getOrder() { return order; }
    public UUID getProductId() { return productId; }
    public Integer getQty() { return qty; }
    public BigDecimal getUnitPriceSnapshot() { return unitPriceSnapshot; }
    public String getProductNameSnapshot() { return productNameSnapshot; }

    public BigDecimal lineTotal() {
        return unitPriceSnapshot.multiply(BigDecimal.valueOf(qty));
    }
}
