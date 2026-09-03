package com.smepos.security;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TotpTest {

    // RFC 6238 Appendix B's official SHA1 test vectors: 20-byte ASCII seed
    // "12345678901234567890", 8-digit truncation. Proves the HMAC/counter/
    // dynamic-truncation core is byte-for-byte spec-correct — the 6-digit
    // production path (Totp.generate/verify) is the exact same logic with a
    // different modulus, so this is what actually justifies not reaching
    // for a library for something security-critical.
    private static final byte[] RFC_SEED = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    @Test
    void matchesRfc6238OfficialTestVectors() {
        assertEquals("94287082", Totp.generate(RFC_SEED, 59, 8));
        assertEquals("07081804", Totp.generate(RFC_SEED, 1111111109, 8));
        assertEquals("14050471", Totp.generate(RFC_SEED, 1111111111, 8));
        assertEquals("89005924", Totp.generate(RFC_SEED, 1234567890, 8));
        assertEquals("69279037", Totp.generate(RFC_SEED, 2000000000, 8));
        assertEquals("65353130", Totp.generate(RFC_SEED, 20000000000L, 8));
    }

    @Test
    void verifyAcceptsCurrentStepAndRejectsWrongCode() {
        byte[] secret = Totp.generateSecret();
        long now = 1_700_000_000L;
        String code = Totp.generate(secret, now);

        assertTrue(Totp.verify(secret, code, now));
        assertFalse(Totp.verify(secret, "000000", now));
    }

    @Test
    void verifyToleratesOneStepOfClockDrift() {
        byte[] secret = Totp.generateSecret();
        long now = 1_700_000_000L;
        String code = Totp.generate(secret, now);

        assertTrue(Totp.verify(secret, code, now + 30)); // one step ahead
        assertTrue(Totp.verify(secret, code, now - 30)); // one step behind
        assertFalse(Totp.verify(secret, code, now + 60)); // two steps — too far
    }

    @Test
    void provisioningUriCarriesTheSameSecretAsBase32() {
        byte[] secret = Totp.generateSecret();
        String uri = Totp.provisioningUri(secret, "SME POS", "admin_test");

        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret=" + Base32.encode(secret)));
        assertTrue(uri.contains("digits=6"));
        assertTrue(uri.contains("period=30"));
    }
}
