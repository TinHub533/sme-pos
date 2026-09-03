package com.smepos.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Named AppUser, not User, to avoid clashing with
// org.springframework.security.core.userdetails.User in the security layer.
@Entity
@Table(name = "app_users")
public class AppUser {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    // Base32-encoded TOTP secret (see security.Totp/Base32). Null until MFA
    // is enrolled. Set on enroll, kept even while mfaEnabled is still false
    // (enrolled-but-not-confirmed) so /auth/mfa/confirm can verify against
    // it; cleared on disable.
    @Column(name = "mfa_secret")
    private String mfaSecret;

    // False until a submitted code has actually been verified against
    // mfaSecret via /auth/mfa/confirm — enrolling alone (which just
    // generates and stores a secret) never flips this on its own, so a
    // half-finished enrollment can't accidentally lock someone out.
    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled = false;

    protected AppUser() {}

    public AppUser(UUID shopId, String username, String passwordHash, String name, Role role) {
        this.shopId = shopId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
    }

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public Role getRole() { return role; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getMfaSecret() { return mfaSecret; }
    public boolean isMfaEnabled() { return mfaEnabled; }
    public void setMfaSecret(String mfaSecret) { this.mfaSecret = mfaSecret; }
    public void setMfaEnabled(boolean mfaEnabled) { this.mfaEnabled = mfaEnabled; }
}
