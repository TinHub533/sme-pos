package com.smepos.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shops")
public class Shop {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "currency_default", nullable = false)
    private String currencyDefault = "USD";

    // Admin-controlled suspend/reactivate. Suspended shops keep their data
    // but should be blocked from login at the auth layer (see AuthService).
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    protected Shop() {}

    public Shop(String name, String currencyDefault) {
        this.name = name;
        this.currencyDefault = currencyDefault;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getCurrencyDefault() { return currencyDefault; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
}
