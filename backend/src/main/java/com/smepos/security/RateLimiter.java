package com.smepos.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory fixed-window rate limiter, keyed by an arbitrary string. No
 * external store (Redis etc.) — this app runs as a single instance today;
 * if that ever changes, each instance would enforce its own independent
 * limit rather than a shared one, which may no longer be tight enough.
 */
@Component
public class RateLimiter {

    private record Window(long windowStartEpochSecond, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /** True if this call is allowed under the limit, false if it should be rejected. */
    public boolean tryConsume(String key, int maxRequests, long windowSeconds) {
        long now = Instant.now().getEpochSecond();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartEpochSecond() >= windowSeconds) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count().incrementAndGet();
            return existing;
        });

        // Opportunistic cleanup (~1% of calls) instead of a scheduled job —
        // keeps the map from growing unboundedly across many distinct keys
        // (e.g. many source IPs hitting /auth/login) over the app's uptime.
        if (ThreadLocalRandom.current().nextInt(100) == 0) {
            windows.entrySet().removeIf(e -> now - e.getValue().windowStartEpochSecond() >= windowSeconds * 10);
        }

        return window.count().get() <= maxRequests;
    }
}
