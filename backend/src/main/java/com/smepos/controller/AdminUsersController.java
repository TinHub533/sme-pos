package com.smepos.controller;

import com.smepos.dto.AdminDtos.AdminUserResponse;
import com.smepos.dto.AdminDtos.CreateAdminRequest;
import com.smepos.dto.UserDtos.ResetPasswordRequest;
import com.smepos.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

// ADMIN-only, ongoing management: once bootstrap has created the first
// admin, further admins are added here rather than through the one-shot
// public endpoint in AdminBootstrapController.
@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsersController {

    private final AdminUserService adminUserService;

    public AdminUsersController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public List<AdminUserResponse> list() {
        return adminUserService.listAdmins();
    }

    @PostMapping
    public AdminUserResponse create(@Valid @RequestBody CreateAdminRequest request) {
        return adminUserService.createAdmin(request);
    }

    @PostMapping("/{userId}/reset-password")
    public void resetPassword(@PathVariable UUID userId, @Valid @RequestBody ResetPasswordRequest request) {
        adminUserService.resetAdminPassword(userId, request);
    }
}
