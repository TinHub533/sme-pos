package com.smepos.controller;

import com.smepos.dto.AuthDtos.ChangePasswordRequest;
import com.smepos.dto.AuthDtos.LoginRequest;
import com.smepos.dto.AuthDtos.LoginResponse;
import com.smepos.dto.AuthDtos.MfaCodeRequest;
import com.smepos.dto.AuthDtos.MfaEnrollResponse;
import com.smepos.dto.AuthDtos.MfaStatusResponse;
import com.smepos.service.AuthService;
import com.smepos.service.MfaService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final MfaService mfaService;

    public AuthController(AuthService authService, MfaService mfaService) {
        this.authService = authService;
        this.mfaService = mfaService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Not covered by /auth/**'s permitAll (see SecurityConfig, which
    // narrows that to /auth/login specifically) — this one requires an
    // authenticated caller, any role.
    @PostMapping("/change-password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
    }

    // ADMIN-only: MFA exists to protect platform-wide suspend power, not
    // every role. Each acts on the caller's own account (see MfaService) —
    // there's no path here for one admin to enroll/disable MFA for another.
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/mfa/status")
    public MfaStatusResponse mfaStatus() {
        return mfaService.status();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/mfa/enroll")
    public MfaEnrollResponse enrollMfa() {
        return mfaService.enroll();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/mfa/confirm")
    public void confirmMfa(@Valid @RequestBody MfaCodeRequest request) {
        mfaService.confirm(request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/mfa/disable")
    public void disableMfa(@Valid @RequestBody MfaCodeRequest request) {
        mfaService.disable(request);
    }
}
