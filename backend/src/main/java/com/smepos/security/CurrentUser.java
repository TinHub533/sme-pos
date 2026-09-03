package com.smepos.security;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Small accessor for "who and which shop is making this request", pulled
 * from the JWT-derived UserPrincipal already sitting in the security
 * context. Centralizing this avoids every controller re-casting
 * getPrincipal() and keeps shop-scoping consistent.
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static UserPrincipal get() {
        return (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public static UUID shopId() {
        return get().getShopId();
    }

    public static UUID userId() {
        return get().getId();
    }
}
