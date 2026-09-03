package com.smepos.controller;

import com.smepos.dto.ShopDtos.CreateShopRequest;
import com.smepos.dto.ShopDtos.OnboardingResponse;
import com.smepos.service.ShopService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

// Public — no auth required to create a new shop. Deliberately unguarded
// today (see ShopService javadoc); add a captcha/rate-limit or an
// admin-approval step before this is internet-facing for real.
@RestController
@RequestMapping("/onboarding")
public class OnboardingController {

    private final ShopService shopService;

    public OnboardingController(ShopService shopService) {
        this.shopService = shopService;
    }

    @PostMapping("/shop")
    public OnboardingResponse createShop(@Valid @RequestBody CreateShopRequest request) {
        return shopService.onboardShop(request);
    }
}
