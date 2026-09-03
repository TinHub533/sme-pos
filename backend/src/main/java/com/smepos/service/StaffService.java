package com.smepos.service;

import com.smepos.dto.UserDtos.CreateStaffRequest;
import com.smepos.dto.UserDtos.ResetPasswordRequest;
import com.smepos.dto.UserDtos.StaffResponse;
import com.smepos.entity.AppUser;
import com.smepos.entity.Role;
import com.smepos.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StaffService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Username is globally unique (see AppUser), so check across all shops, same as onboarding. */
    @Transactional
    public StaffResponse createCashier(UUID shopId, CreateStaffRequest req) {
        if (userRepository.findByUsername(req.username()).isPresent()) {
            throw new IllegalStateException("Username already taken: " + req.username());
        }
        AppUser user = userRepository.save(new AppUser(
                shopId, req.username(), passwordEncoder.encode(req.password()), req.name(), Role.CASHIER));
        return toResponse(user);
    }

    public List<StaffResponse> listStaff(UUID shopId) {
        return userRepository.findByShopIdOrderByCreatedAtAsc(shopId).stream().map(this::toResponse).toList();
    }

    // Owner-initiated, not self-service — "forgot password" self-service
    // needs real email/SMS delivery this project doesn't have. A shop only
    // ever has cashiers reporting to its owner, so this covers the common
    // case (cashier forgot their password); it deliberately can't be used
    // to reset another Owner's own password.
    @Transactional
    public void resetCashierPassword(UUID shopId, UUID userId, ResetPasswordRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Staff account not found: " + userId));
        // Shop-scoped like OrderService.requireOrderInShop: a cashier ID from
        // another shop is indistinguishable from one that never existed.
        if (!user.getShopId().equals(shopId)) {
            throw new IllegalArgumentException("Staff account not found: " + userId);
        }
        if (user.getRole() != Role.CASHIER) {
            throw new IllegalStateException("Only cashier accounts can be reset here.");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }

    private StaffResponse toResponse(AppUser user) {
        return new StaffResponse(user.getId(), user.getUsername(), user.getName(), user.getRole().name());
    }
}
