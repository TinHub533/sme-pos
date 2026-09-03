package com.smepos.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_khr")
    private BigDecimal priceKhr;

    @Column(name = "price_usd")
    private BigDecimal priceUsd;

    private String category;

    private boolean active = true;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    protected Product() {}

    public Product(UUID shopId, String sku, String name, BigDecimal priceKhr, BigDecimal priceUsd, String category) {
        this.shopId = shopId;
        this.sku = sku;
        this.name = name;
        this.priceKhr = priceKhr;
        this.priceUsd = priceUsd;
        this.category = category;
    }

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public String getSku() { return sku; }
    public String getName() { return name; }
    public BigDecimal getPriceKhr() { return priceKhr; }
    public BigDecimal getPriceUsd() { return priceUsd; }
    public String getCategory() { return category; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
