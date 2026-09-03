package com.smepos.security;

import com.smepos.entity.AppUser;
import com.smepos.repository.ShopRepository;
import com.smepos.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    public CustomUserDetailsService(UserRepository userRepository, ShopRepository shopRepository) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("No user: " + username));
        // Re-checked on every call, not cached — this runs once per request
        // (JwtAuthenticationFilter calls loadUserByUsername for every
        // authenticated request, not just at login), which is what makes a
        // shop suspension take effect on already-issued JWTs immediately
        // rather than only at their next login.
        boolean shopActive = shopRepository.findById(user.getShopId())
                .map(com.smepos.entity.Shop::isActive)
                .orElse(false);
        return new UserPrincipal(user, shopActive);
    }
}
