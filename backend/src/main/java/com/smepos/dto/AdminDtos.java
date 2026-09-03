package com.smepos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class AdminDtos {

    public record CreateAdminRequest(
            @NotBlank String username,
            @NotBlank @Size(min = 8) String password,
            @NotBlank String name
    ) {}

    public record AdminUserResponse(
            UUID id,
            String username,
            String name
    ) {}

    // Mirrors ShopDtos.OnboardingResponse's shape/purpose: create + return a
    // token in one call so the new admin is signed in immediately, same UX
    // as shop onboarding.
    public record BootstrapResponse(
            AdminUserResponse admin,
            String token,
            String username,
            String role
    ) {}

    public record BootstrapStatusResponse(
            boolean bootstrapped
    ) {}
}
