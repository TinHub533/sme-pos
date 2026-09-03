package com.smepos.controller;

import com.smepos.security.CurrentUser;
import com.smepos.service.InventoryService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    public record RestockRequest(int qty, @NotBlank String reason) {}
    public record AdjustRequest(int delta, @NotBlank String reason) {}

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/{productId}/restock")
    public void restock(@PathVariable UUID productId, @RequestBody RestockRequest req) {
        inventoryService.restock(productId, req.qty(), CurrentUser.userId(), req.reason());
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/{productId}/adjust")
    public void adjust(@PathVariable UUID productId, @RequestBody AdjustRequest req) {
        inventoryService.adjust(productId, req.delta(), CurrentUser.userId(), req.reason());
    }
}
