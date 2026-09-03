package com.smepos.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "inventory")
public class Inventory {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "qty_on_hand", nullable = false)
    private Integer qtyOnHand;

    @Column(name = "reorder_threshold", nullable = false)
    private Integer reorderThreshold;

    // Optimistic locking: every update stamps this, and a concurrent
    // write with a stale version throws OptimisticLockException instead
    // of silently overwriting. This is the cheap alternative to
    // SELECT ... FOR UPDATE — use it when contention is low (most SKUs,
    // most of the time) and reserve pessimistic locking (see
    // InventoryService) for known hot paths.
    @Version
    private Long version;

    protected Inventory() {}

    public Inventory(UUID productId, Integer qtyOnHand, Integer reorderThreshold) {
        this.productId = productId;
        this.qtyOnHand = qtyOnHand;
        this.reorderThreshold = reorderThreshold;
    }

    public UUID getId() { return id; }
    public UUID getProductId() { return productId; }
    public Integer getQtyOnHand() { return qtyOnHand; }
    public void setQtyOnHand(Integer qtyOnHand) { this.qtyOnHand = qtyOnHand; }
    public Integer getReorderThreshold() { return reorderThreshold; }
    public Long getVersion() { return version; }
}
