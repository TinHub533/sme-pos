package com.smepos.security;

import com.smepos.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

/**
 * Per-IP rate limit on specific endpoints where the caller's identity can't
 * be trusted yet (pre-auth login) or where an attacker could otherwise spam
 * requests cheaply (the payment webhook). Everything else is unlimited
 * today. Runs as a HandlerInterceptor (before the controller method, after
 * Spring Security's filter chain has already permitted the request), so a
 * limited /auth/login attempt never reaches the BCrypt check at all.
 *
 * IMPORTANT, honestly documented rather than glossed over: with
 * tools/nginx/ in front of this app, /auth/login's limit is NOT
 * meaningfully per-real-user-IP, even with trustProxyHeaders on. Browser
 * traffic for login goes browser -> nginx -> frontend's own
 * /api/auth/login Route Handler -> a server-to-server fetch straight to
 * this backend over the internal Docker network, which never goes back
 * through nginx and never forwards the original client's IP — every real
 * user's login attempt looks identical to this interceptor (same source:
 * the frontend container). The limit still works, it's just effectively
 * one shared bucket for the whole app's login traffic, not one per
 * attacker. /webhooks/khqr/payment-confirm doesn't have this problem —
 * nginx is genuinely the direct, single-hop front door for that one path
 * (external gateway -> nginx -> this backend), so trustProxyHeaders +
 * the X-Forwarded-For handling below is fully meaningful there. Making
 * /auth/login's limit properly per-user would mean threading the real
 * client IP through the frontend's Route Handler too — a bigger change,
 * not done here.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private record Limit(int maxRequests, long windowSeconds) {}

    private static final Map<String, Limit> LIMITS = Map.of(
            "/auth/login", new Limit(10, 60),
            "/webhooks/khqr/payment-confirm", new Limit(30, 60)
    );

    private final RateLimiter rateLimiter;

    // Off by default — trusting X-Forwarded-For is only safe when this app
    // is genuinely unreachable except through a trusted reverse proxy that
    // sets that header itself (tools/nginx/). root docker-compose.yml still
    // publishes the backend's 8080 directly for local dev/testing
    // convenience, so defaulting this to true there would let anyone
    // calling it directly spoof their way around the limit with a forged
    // header. Set APP_TRUST_PROXY_HEADERS=true only in a deployment where
    // 8080 is genuinely not reachable except via tools/nginx/.
    @Value("${app.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    public RateLimitInterceptor(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Limit limit = LIMITS.get(request.getRequestURI());
        if (limit == null) {
            return true;
        }
        String key = request.getRequestURI() + ":" + clientIp(request);
        if (!rateLimiter.tryConsume(key, limit.maxRequests(), limit.windowSeconds())) {
            throw new TooManyRequestsException("Too many requests — try again shortly.");
        }
        return true;
    }

    private String clientIp(HttpServletRequest request) {
        if (trustProxyHeaders) {
            // tools/nginx/nginx.conf sets this via $proxy_add_x_forwarded_for,
            // which APPENDS nginx's own view of the connecting peer to
            // whatever X-Forwarded-For the client already sent — so the
            // LAST entry is the one nginx itself observed and can be
            // trusted; any earlier entries are client-supplied and
            // trivially spoofable (a client can send its own fake
            // "X-Forwarded-For: 1.2.3.4" and nginx will just append the
            // real IP after it). Taking the first entry here would let
            // anyone bypass the rate limit by lying in that header.
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                String[] parts = forwardedFor.split(",");
                return parts[parts.length - 1].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
