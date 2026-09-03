package com.smepos.controller;

import com.smepos.dto.AdminDtos.BootstrapResponse;
import com.smepos.dto.AdminDtos.BootstrapStatusResponse;
import com.smepos.dto.AdminDtos.CreateAdminRequest;
import com.smepos.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

// Deliberately public (see SecurityConfig) and separate from the
// ADMIN-only AdminController/AdminUsersController: this is the one path
// that has to work with zero credentials in the system, to solve the
// chicken-and-egg problem of creating the very first admin. AdminUserService
// guards it so it only ever succeeds once (while no ADMIN account exists),
// so this never becomes a standing "become admin" backdoor.
@RestController
@RequestMapping("/admin/bootstrap")
public class AdminBootstrapController {

    private final AdminUserService adminUserService;

    public AdminBootstrapController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public BootstrapStatusResponse status() {
        return adminUserService.status();
    }

    @PostMapping
    public BootstrapResponse bootstrap(@Valid @RequestBody CreateAdminRequest request) {
        return adminUserService.bootstrap(request);
    }
}
