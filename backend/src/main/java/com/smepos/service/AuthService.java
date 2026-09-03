package com.smepos.service;

import com.smepos.dto.AuthDtos.ChangePasswordRequest;
import com.smepos.dto.AuthDtos.LoginRequest;
import com.smepos.dto.AuthDtos.LoginResponse;
import com.smepos.entity.AppUser;
import com.smepos.repository.UserRepository;
import com.smepos.security.Base32;
import com.smepos.security.CurrentUser;
import com.smepos.security.JwtService;
import com.smepos.security.Totp;
import com.smepos.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                        UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        UserPrincipal principal;
        try {
            var authToken = new UsernamePasswordAuthenticationToken(request.username(), request.password());
            // A suspended shop's user fails here via DisabledException
            // (UserPrincipal.isEnabled() == shop.isActive(), checked by
            // DaoAuthenticationProvider's preAuthenticationChecks before
            // the password is even compared) — caught by the same
            // catch-all below as a wrong password, so the two cases stay
            // identical in timing/response shape, deliberately not leaking
            // which reason applied to an attacker probing usernames.
            var authentication = authenticationManager.authenticate(authToken);
            principal = (UserPrincipal) authentication.getPrincipal();
        } catch (org.springframework.security.core.AuthenticationException e) {
            throw new BadCredentialsException("Invalid username or password");
        }

        // Deliberately outside the try/catch above: password/shop-suspended
        // failures must stay indistinguishable ("Invalid username or
        // password"), but an MFA-enabled account needs the frontend to
        // actually tell "please enter your code" apart from "wrong
        // password" — that distinction only makes sense once the password
        // has already checked out, so it can't leak anything to someone who
        // doesn't already know the password.
        AppUser user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        if (user.isMfaEnabled()) {
            if (request.mfaCode() == null || request.mfaCode().isBlank()) {
                throw new BadCredentialsException("MFA_REQUIRED");
            }
            if (!Totp.verify(Base32.decode(user.getMfaSecret()), request.mfaCode(), Instant.now().getEpochSecond())) {
                throw new BadCredentialsException("Invalid MFA code");
            }
        }

        String token = jwtService.generateToken(principal);
        String role = principal.getAuthorities().iterator().next().getAuthority();
        return new LoginResponse(token, principal.getUsername(), role);
    }

    // Self-service — see the note on AuthDtos.ChangePasswordRequest. Any
    // authenticated role can call this on their own account; there's no
    // path here to change someone else's password (that's the separate
    // admin/owner-initiated reset endpoints).
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        // Not expected to actually miss — CurrentUser.userId() only exists
        // because a valid JWT was already presented for this user.
        AppUser user = userRepository.findById(CurrentUser.userId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
