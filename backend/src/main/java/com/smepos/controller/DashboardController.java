package com.smepos.controller;

import com.smepos.dto.DashboardDtos.DashboardSummary;
import com.smepos.security.CurrentUser;
import com.smepos.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // No @PreAuthorize role restriction — both OWNER and CASHIER can see
    // today's summary; write-side actions stay owner-only where it matters.
    @GetMapping("/summary")
    public DashboardSummary summary() {
        return dashboardService.getSummary(CurrentUser.shopId());
    }
}
