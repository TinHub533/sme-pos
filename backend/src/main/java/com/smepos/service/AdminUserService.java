package com.smepos.service;

import com.smepos.dto.AdminDtos.AdminUserResponse;
import com.smepos.dto.AdminDtos.BootstrapResponse;
import com.smepos.dto.AdminDtos.BootstrapStatusResponse;
import com.smepos.dto.AdminDtos.CreateAdminRequest;
import com.smepos.dto.AuthDtos.LoginRequest;
import com.smepos.dto.AuthDtos.LoginResponse;
import com.smepos.dto.UserDtos.ResetPasswordRequest;
import com.smepos.entity.AppUser;
import com.smepos.entity.Role;
import com.smepos.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AdminUserService {

    // Same reserved shop referenced in ShopService — admin accounts have to
    // point at *some* shop since app_users.shop_id is NOT NULL.
    private static final UUID SYSTEM_SHOP_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    // Arbitrary constant — pg_advisory_xact_lock's key just needs to be
    // unique to this specific lock's purpose within the app, not globally
    // meaningful. See bootstrap()'s comment for why this exists.
    private static final long BOOTSTRAP_LOCK_KEY = 7_301_994_001L;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final AuditLogService auditLogService;
    private final EntityManager entityManager;

    public AdminUserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                             AuthService authService, AuditLogService auditLogService,
                             EntityManager entityManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.auditLogService = auditLogService;
        this.entityManager = entityManager;
    }

    public BootstrapStatusResponse status() {
        return new BootstrapStatusResponse(userRepository.existsByRole(Role.ADMIN));
    }

    // Public, one-time-only: succeeds only while zero ADMIN accounts exist,
    // so it can't be used as a standing "become admin" backdoor once the
    // first admin is created. Auto-logs in, mirroring ShopService.onboardShop.
    //
    // The existsByRole check below is otherwise a classic TOCTOU race: two
    // concurrent requests arriving before either commits would both see
    // zero admins and both proceed, creating two "first" admins — proven by
    // AdminBootstrapConcurrencyIT before this lock was added. A Postgres
    // advisory transaction lock closes it: the second transaction blocks
    // here until the first commits or rolls back, so by the time it
    // acquires the lock and runs existsByRole, the first admin (if any)
    // is already visible. Released automatically at transaction end either
    // way, no unlock call needed.
    @Transactional
    public BootstrapResponse bootstrap(CreateAdminRequest req) {
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(:key)")
                .setParameter("key", BOOTSTRAP_LOCK_KEY)
                .getSingleResult();
        if (userRepository.existsByRole(Role.ADMIN)) {
            throw new IllegalStateException(
                    "An admin account already exists — ask an existing admin to create new ones.");
        }
        AdminUserResponse admin = createAdminInternal(req);
        // Self-referential: no authenticated caller exists yet on this
        // public endpoint, so the newly created admin is both actor and target.
        auditLogService.record(admin.id(), admin.username(), "ADMIN_BOOTSTRAP", "USER", admin.id().toString(), admin.username());
        // null mfaCode: a freshly bootstrapped admin can't have MFA enabled yet.
        LoginResponse login = authService.login(new LoginRequest(req.username(), req.password(), null));
        return new BootstrapResponse(admin, login.token(), login.username(), login.role());
    }

    @Transactional
    public AdminUserResponse createAdmin(CreateAdminRequest req) {
        AdminUserResponse admin = createAdminInternal(req);
        auditLogService.record("CREATE_ADMIN", "USER", admin.id().toString(), admin.username());
        return admin;
    }

    public List<AdminUserResponse> listAdmins() {
        return userRepository.findByRoleOrderByCreatedAtAsc(Role.ADMIN).stream()
                .map(this::toResponse)
                .toList();
    }

    // Admin-initiated, not self-service — see the note on
    // UserDtos.ResetPasswordRequest. Doesn't help if there's only one admin
    // and they're the one locked out — same bootstrap-style limit as before
    // this feature existed at all; needs direct DB access in that case.
    @Transactional
    public void resetAdminPassword(UUID userId, ResetPasswordRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Admin account not found: " + userId));
        if (user.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Only admin accounts can be reset here.");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        auditLogService.record("RESET_ADMIN_PASSWORD", "USER", userId.toString(), user.getUsername());
    }

    private AdminUserResponse createAdminInternal(CreateAdminRequest req) {
        if (userRepository.findByUsername(req.username()).isPresent()) {
            throw new IllegalStateException("Username already taken: " + req.username());
        }
        AppUser user = userRepository.save(new AppUser(
                SYSTEM_SHOP_ID, req.username(), passwordEncoder.encode(req.password()), req.name(), Role.ADMIN));
        return toResponse(user);
    }

    private AdminUserResponse toResponse(AppUser user) {
        return new AdminUserResponse(user.getId(), user.getUsername(), user.getName());
    }
}
