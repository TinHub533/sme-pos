package com.smepos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public class ShopDtos {

    public record CreateShopRequest(
            @NotBlank String shopName,
            @NotBlank String currencyDefault,   // "USD" or "KHR"
            @NotBlank String ownerUsername,
            @NotBlank @Size(min = 8) String ownerPassword,
            @NotBlank String ownerName
    ) {}

    public record ShopResponse(
            UUID id,
            String name,
            String currencyDefault,
            boolean active
    ) {}

    // Owner is nullable: a shop's Owner account could theoretically be
    // missing (e.g. deleted directly in the DB) even though onboarding
    // always creates one — this DTO shouldn't assume that invariant holds
    // forever just because it does today.
    public record ShopDetailResponse(
            UUID id,
            String name,
            String currencyDefault,
            boolean active,
            Instant createdAt,
            String ownerUsername,
            long productCount,
            long staffCount
    ) {}

    // Returned by onboarding so the frontend can go straight from setup
    // into a logged-in session instead of bouncing to a separate login page.
    public record OnboardingResponse(
            ShopResponse shop,
            String token,
            String username,
            String role
    ) {}
}
