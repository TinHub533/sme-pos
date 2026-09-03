package com.smepos.service;

import com.smepos.dto.AuthDtos.LoginRequest;
import com.smepos.dto.AuthDtos.LoginResponse;
import com.smepos.dto.ShopDtos.CreateShopRequest;
import com.smepos.dto.ShopDtos.OnboardingResponse;
import com.smepos.dto.ShopDtos.ShopDetailResponse;
import com.smepos.dto.ShopDtos.ShopResponse;
import com.smepos.dto.UserDtos.ResetPasswordRequest;
import com.smepos.entity.AppUser;
import com.smepos.entity.Role;
import com.smepos.entity.Shop;
import com.smepos.repository.ProductRepository;
import com.smepos.repository.ShopRepository;
import com.smepos.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ShopService {

    // The reserved shop that ADMIN accounts are attached to (app_users.shop_id
    // is NOT NULL, so admins need *some* shop row) — see
    // V2__add_admin_role_and_shop_status.sql. It must never appear in the
    // admin-facing shop list or be suspendable: ShopService.setActive is what
    // Auth.login() checks before issuing a token, so suspending this shop
    // would lock out every admin, including the ability to undo it.
    private static final UUID SYSTEM_SHOP_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final AuditLogService auditLogService;

    public ShopService(ShopRepository shopRepository, UserRepository userRepository,
                        ProductRepository productRepository, PasswordEncoder passwordEncoder,
                        AuthService authService, AuditLogService auditLogService) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.auditLogService = auditLogService;
    }

    /**
     * Public onboarding: create a shop and its first Owner account in one
     * step, then log the owner straight in. No admin approval gate today —
     * flag this if the business ever needs to vet shops before they go
     * live; right now anyone hitting this endpoint gets a working shop.
     */
    @Transactional
    public OnboardingResponse onboardShop(CreateShopRequest req) {
        if (userRepository.findByUsername(req.ownerUsername()).isPresent()) {
            throw new IllegalStateException("Username already taken: " + req.ownerUsername());
        }

        Shop shop = shopRepository.save(new Shop(req.shopName(), req.currencyDefault()));

        userRepository.save(new AppUser(
                shop.getId(),
                req.ownerUsername(),
                passwordEncoder.encode(req.ownerPassword()),
                req.ownerName(),
                Role.OWNER));

        // null mfaCode: a freshly onboarded Owner can't have MFA enabled yet.
        LoginResponse login = authService.login(new LoginRequest(req.ownerUsername(), req.ownerPassword(), null));

        return new OnboardingResponse(toResponse(shop), login.token(), login.username(), login.role());
    }

    public List<ShopResponse> listAll() {
        return shopRepository.findAll().stream()
                .filter(shop -> !shop.getId().equals(SYSTEM_SHOP_ID))
                .map(this::toResponse)
                .toList();
    }

    public ShopDetailResponse getDetail(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + shopId));

        // Small, per-shop staff list (owners + a handful of cashiers) — a
        // linear scan for the Owner is simpler than a dedicated derived
        // query and this list is never going to be large enough to matter.
        String ownerUsername = userRepository.findByShopIdOrderByCreatedAtAsc(shopId).stream()
                .filter(u -> u.getRole() == Role.OWNER)
                .findFirst()
                .map(AppUser::getUsername)
                .orElse(null);

        long productCount = productRepository.countByShopIdAndActiveTrue(shopId);
        long staffCount = userRepository.countByShopId(shopId);

        return new ShopDetailResponse(shop.getId(), shop.getName(), shop.getCurrencyDefault(), shop.isActive(),
                shop.getCreatedAt(), ownerUsername, productCount, staffCount);
    }

    @Transactional
    public ShopResponse setActive(UUID shopId, boolean active) {
        if (shopId.equals(SYSTEM_SHOP_ID)) {
            throw new IllegalStateException("The system shop cannot be suspended or reactivated.");
        }
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + shopId));
        shop.setActive(active);
        ShopResponse response = toResponse(shopRepository.save(shop));
        auditLogService.record(active ? "SHOP_REACTIVATE" : "SHOP_SUSPEND", "SHOP", shopId.toString(), shop.getName());
        return response;
    }

    // Admin-initiated support path — see the note on
    // UserDtos.ResetPasswordRequest — for the case a shop's Owner is locked
    // out and calls platform support; not self-service.
    @Transactional
    public void resetOwnerPassword(UUID shopId, ResetPasswordRequest req) {
        if (!shopRepository.existsById(shopId)) {
            throw new IllegalArgumentException("Shop not found: " + shopId);
        }
        AppUser owner = userRepository.findByShopIdOrderByCreatedAtAsc(shopId).stream()
                .filter(u -> u.getRole() == Role.OWNER)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Shop has no owner account: " + shopId));
        owner.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(owner);
        auditLogService.record("RESET_OWNER_PASSWORD", "SHOP", shopId.toString(), owner.getUsername());
    }

    private ShopResponse toResponse(Shop shop) {
        return new ShopResponse(shop.getId(), shop.getName(), shop.getCurrencyDefault(), shop.isActive());
    }
}
