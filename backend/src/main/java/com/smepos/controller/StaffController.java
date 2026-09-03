package com.smepos.controller;

import com.smepos.dto.UserDtos.CreateStaffRequest;
import com.smepos.dto.UserDtos.ResetPasswordRequest;
import com.smepos.dto.UserDtos.StaffResponse;
import com.smepos.security.CurrentUser;
import com.smepos.service.StaffService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

// Owner-only: creating a login is an escalation-adjacent action, unlike the
// mostly-open OrderController endpoints.
@RestController
@RequestMapping("/users")
@PreAuthorize("hasRole('OWNER')")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public List<StaffResponse> list() {
        return staffService.listStaff(CurrentUser.shopId());
    }

    @PostMapping
    public StaffResponse create(@Valid @RequestBody CreateStaffRequest request) {
        return staffService.createCashier(CurrentUser.shopId(), request);
    }

    @PostMapping("/{userId}/reset-password")
    public void resetPassword(@PathVariable UUID userId, @Valid @RequestBody ResetPasswordRequest request) {
        staffService.resetCashierPassword(CurrentUser.shopId(), userId, request);
    }
}
