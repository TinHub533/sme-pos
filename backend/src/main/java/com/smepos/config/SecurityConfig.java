package com.smepos.config;

import com.smepos.security.CustomUserDetailsService;
import com.smepos.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;

@Configuration
@EnableWebSecurity
// REQUIRED for @PreAuthorize to be enforced at all — without this,
// every @PreAuthorize annotation in the codebase is silently ignored
// and the method runs regardless of role. Caught this only when wiring
// the new ADMIN-only endpoints; it means the OWNER-only checks on
// Product/Inventory/DailyClosing controllers had never actually been
// active. If this project already shipped anywhere, treat this as an
// incident: any CASHIER token could have hit those endpoints.
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CustomUserDetailsService userDetailsService,
                           JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // stateless JWT API, no cookies to protect
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Narrowly /auth/login, not /auth/**: AuthController also
                // has /auth/change-password, which must stay authenticated
                // (anyRequest().authenticated() below) — a blanket /auth/**
                // permitAll would silently make any future /auth/* endpoint
                // public by default too.
                .requestMatchers("/auth/login", "/webhooks/**", "/onboarding/**").permitAll()
                // Public only for the bootstrap chicken-and-egg problem (no
                // credentials can exist yet to gate this); AdminUserService
                // enforces that it only ever succeeds once. /admin/users and
                // /admin/shops stay under anyRequest().authenticated() +
                // @PreAuthorize below.
                .requestMatchers("/admin/bootstrap").permitAll()
                // /** not just an exact match: probes.enabled (application.yml)
                // exposes /actuator/health/liveness and /readiness as their
                // own sub-paths, both needed unauthenticated for a Docker
                // HEALTHCHECK or orchestrator probe. show-details:
                // when-authorized (application.yml) still means an anonymous
                // caller here only ever sees UP/DOWN, not the full component
                // breakdown — that needs the ADMIN role, same as the rest of
                // /actuator/** below.
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                // API docs — public because the schema itself isn't
                // sensitive (same endpoints/DTOs are visible by reading
                // the source), and Swagger UI's "Try it out" still needs a
                // real Bearer token to call anything that matters.
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Spring Boot's error-rendering machinery internally forwards
                // to /error to build the response body, and FilterChainProxy
                // re-runs the ENTIRE security chain on that forwarded
                // dispatch as its own request. Without this, an
                // AccessDeniedException correctly produces 403 on the
                // original request, then the /error forward — anonymous,
                // since JwtAuthenticationFilter's context doesn't carry over
                // to the forwarded dispatch — hits anyRequest().authenticated()
                // again and overwrites the response with a SECOND security
                // decision (401 from the entry point below), stomping the
                // original 403. Standard fix: let /error through unauthenticated
                // so only the original request's decision ever sets the status.
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // Without an explicit entry point, Spring Security's default
            // fallback (no httpBasic()/formLogin() is configured here) sends
            // 403 for a missing/invalid/expired JWT — indistinguishable from
            // a real @PreAuthorize role rejection, which also 403s. That
            // silently contradicted JwtAuthenticationFilter's own comment
            // ("let the security chain reject the request with 401") and
            // made "your session expired, please sign in again" impossible
            // for any client to detect. This restores the documented intent:
            // no/bad/expired token -> 401 (an AuthenticationException, since
            // JwtAuthenticationFilter leaves the request unauthenticated
            // rather than throwing); authenticated-but-wrong-role stays a
            // 403 (AccessDeniedException) via Spring Security's default
            // handler, untouched by this.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));

        return http.build();
    }
}
