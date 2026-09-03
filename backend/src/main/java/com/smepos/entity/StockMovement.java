package com.smepos.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Append-only audit ledger. Never updated or deleted — qty_on_hand on
// Inventory is the current-state cache; this table is the "why did it
// get there" history.
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    public enum Type { SALE, RESTOCK, ADJUSTMENT }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    // Signed: negative for SALE, positive for RESTOCK, either for ADJUSTMENT.
    @Column(nullable = false)
    private Integer qty;

    private String reason;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    protected StockMovement() {}

    public StockMovement(UUID productId, UUID createdBy, Type type, Integer qty, String reason) {
        this.productId = productId;
        this.createdBy = createdBy;
        this.type = type;
        this.qty = qty;
        this.reason = reason;
    }

    public UUID getId() { return id; }
    public UUID getProductId() { return productId; }
    public Type getType() { return type; }
    public Integer getQty() { return qty; }
    public String getReason() { return reason; }
}
