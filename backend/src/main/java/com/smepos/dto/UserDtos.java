package com.smepos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class UserDtos {

    // Owner-created staff accounts are always CASHIER — this endpoint isn't
    // how you get another OWNER or an ADMIN, so role isn't a request field.
    public record CreateStaffRequest(
            @NotBlank String username,
            @NotBlank @Size(min = 8) String password,
            @NotBlank String name
    ) {}

    public record StaffResponse(
            UUID id,
            String username,
            String name,
            String role
    ) {}

    // Shared across Staff/Admin/Shop-owner reset endpoints — a privileged
    // user (Owner, Admin) setting someone else's password directly, not a
    // self-service "forgot password" flow (that needs real email/SMS
    // delivery infrastructure this project doesn't have yet).
    public record ResetPasswordRequest(
            @NotBlank @Size(min = 8) String newPassword
    ) {}
}
