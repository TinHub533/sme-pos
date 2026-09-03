package com.smepos.controller;

import com.smepos.dto.ShopDtos.ShopDetailResponse;
import com.smepos.dto.ShopDtos.ShopResponse;
import com.smepos.dto.UserDtos.ResetPasswordRequest;
import com.smepos.service.ShopService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/shops")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final ShopService shopService;

    public AdminController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping
    public List<ShopResponse> listShops() {
        return shopService.listAll();
    }

    @GetMapping("/{shopId}")
    public ShopDetailResponse shopDetail(@PathVariable UUID shopId) {
        return shopService.getDetail(shopId);
    }

    @PostMapping("/{shopId}/suspend")
    public ShopResponse suspend(@PathVariable UUID shopId) {
        return shopService.setActive(shopId, false);
    }

    @PostMapping("/{shopId}/reactivate")
    public ShopResponse reactivate(@PathVariable UUID shopId) {
        return shopService.setActive(shopId, true);
    }

    @PostMapping("/{shopId}/reset-owner-password")
    public void resetOwnerPassword(@PathVariable UUID shopId, @Valid @RequestBody ResetPasswordRequest request) {
        shopService.resetOwnerPassword(shopId, request);
    }
}
