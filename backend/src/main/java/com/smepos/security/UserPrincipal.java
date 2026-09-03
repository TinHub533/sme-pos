package com.smepos.security;

import com.smepos.entity.AppUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Wraps AppUser for Spring Security. Carries shopId through the security
 * context so controllers/services can enforce "you can only touch your
 * own shop's data" without re-querying the user on every request.
 */
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final UUID shopId;
    private final String username;
    private final String passwordHash;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean shopActive;

    public UserPrincipal(AppUser user, boolean shopActive) {
        this.id = user.getId();
        this.shopId = user.getShopId();
        this.username = user.getUsername();
        this.passwordHash = user.getPasswordHash();
        // Prefixed with ROLE_ so Spring Security's hasRole("OWNER") works.
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        this.shopActive = shopActive;
    }

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }

    // Repurposed to mean "this user's shop is active" — checked both at
    // login (DaoAuthenticationProvider's preAuthenticationChecks reject a
    // disabled UserDetails before comparing passwords, throwing
    // DisabledException, which AuthService.login() folds into the same
    // generic "Invalid username or password") and, more importantly, on
    // every subsequent authenticated request via JwtAuthenticationFilter —
    // that's what makes a shop suspension actually revoke a user's
    // already-issued JWTs instead of only blocking new logins.
    @Override public boolean isEnabled() { return shopActive; }
}
