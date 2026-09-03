package com.smepos.service;

import com.smepos.dto.AuthDtos.MfaCodeRequest;
import com.smepos.dto.AuthDtos.MfaEnrollResponse;
import com.smepos.dto.AuthDtos.MfaStatusResponse;
import com.smepos.entity.AppUser;
import com.smepos.repository.UserRepository;
import com.smepos.security.Base32;
import com.smepos.security.CurrentUser;
import com.smepos.security.Totp;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

// ADMIN-only today (enforced by @PreAuthorize on the AuthController methods
// that call this, not here — kept out of this class so it stays reusable if
// MFA ever extends to other roles). Opt-in: enrolling never locks anyone
// out on its own, since mfaEnabled only flips to true once confirm() has
// proven a real code came back from the secret just issued.
@Service
public class MfaService {

    private final UserRepository userRepository;

    public MfaService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public MfaStatusResponse status() {
        return new MfaStatusResponse(currentUser().isMfaEnabled());
    }

    @Transactional
    public MfaEnrollResponse enroll() {
        AppUser user = currentUser();
        if (user.isMfaEnabled()) {
            throw new IllegalStateException("MFA is already enabled — disable it before re-enrolling.");
        }
        byte[] secret = Totp.generateSecret();
        String encodedSecret = Base32.encode(secret);
        user.setMfaSecret(encodedSecret);
        userRepository.save(user);
        return new MfaEnrollResponse(encodedSecret, Totp.provisioningUri(secret, "SME POS", user.getUsername()));
    }

    @Transactional
    public void confirm(MfaCodeRequest request) {
        AppUser user = currentUser();
        if (user.getMfaSecret() == null) {
            throw new IllegalStateException("No MFA enrollment in progress — call enroll first.");
        }
        if (!Totp.verify(Base32.decode(user.getMfaSecret()), request.code(), Instant.now().getEpochSecond())) {
            throw new BadCredentialsException("Invalid MFA code");
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
    }

    @Transactional
    public void disable(MfaCodeRequest request) {
        AppUser user = currentUser();
        if (!user.isMfaEnabled()) {
            throw new IllegalStateException("MFA is not enabled.");
        }
        if (!Totp.verify(Base32.decode(user.getMfaSecret()), request.code(), Instant.now().getEpochSecond())) {
            throw new BadCredentialsException("Invalid MFA code");
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
    }

    private AppUser currentUser() {
        return userRepository.findById(CurrentUser.userId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
