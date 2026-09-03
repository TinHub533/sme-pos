package com.smepos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    // mfaCode is optional and only checked when the account has MFA
    // enabled (see AuthService.login) — every other account ignores it
    // entirely. A missing/wrong code on an MFA-enabled account fails with
    // the exact message "MFA_REQUIRED" (a stable, matchable value, not
    // free text) so the frontend can tell "show the code field" apart from
    // "wrong username/password" without guessing from prose.
    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password,
            String mfaCode
    ) {}

    public record LoginResponse(
            String token,
            String username,
            String role
    ) {}

    // Self-service, any role — distinct from the admin/owner-initiated
    // resets in UserDtos.ResetPasswordRequest (those are for when you've
    // lost access to your account; this is for when you haven't).
    // Requires the current password so a hijacked-but-still-open session
    // can't be used to lock the real owner out permanently.
    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8) String newPassword
    ) {}

    // TOTP MFA — ADMIN-only today (see AuthController/MfaService). enroll()
    // generates and stores a secret but leaves mfaEnabled false; confirm()
    // proves the admin's authenticator app actually has it (a real code
    // came back) before flipping mfaEnabled on.
    public record MfaEnrollResponse(
            String secret,
            String otpauthUri
    ) {}

    public record MfaCodeRequest(
            @NotBlank String code
    ) {}

    public record MfaStatusResponse(
            boolean enabled
    ) {}
}
