package com.smepos.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;

/**
 * TOTP (RFC 6238) built on HOTP (RFC 4226), HMAC-SHA1, 6 digits, 30-second
 * step — the standard combination every authenticator app (Google
 * Authenticator, Authy, 1Password, etc.) expects. Hand-rolled rather than a
 * dependency; see TotpTest for verification against RFC 6238 Appendix B's
 * own official test vectors, which is what actually justifies not reaching
 * for a library here.
 */
public final class Totp {

    private static final int TIME_STEP_SECONDS = 30;
    private static final int SECRET_BYTES = 20; // 160 bits, standard for HMAC-SHA1 TOTP

    private Totp() {}

    public static byte[] generateSecret() {
        byte[] secret = new byte[SECRET_BYTES];
        new SecureRandom().nextBytes(secret);
        return secret;
    }

    public static String generate(byte[] secret, long epochSeconds) {
        return generate(secret, epochSeconds, 6);
    }

    // digits is a parameter (not hardcoded 6) purely so TotpTest can check
    // this against RFC 6238's 8-digit test vectors without a second copy of
    // the algorithm — production callers always go through the 6-digit
    // overload above.
    static String generate(byte[] secret, long epochSeconds, int digits) {
        long counter = epochSeconds / TIME_STEP_SECONDS;
        return hotp(secret, counter, digits);
    }

    /** Accepts a code from the current time step or one step either side, to tolerate clock drift. */
    public static boolean verify(byte[] secret, String code, long epochSeconds) {
        if (code == null || code.isBlank()) {
            return false;
        }
        long counter = epochSeconds / TIME_STEP_SECONDS;
        for (long c = counter - 1; c <= counter + 1; c++) {
            if (hotp(secret, c, 6).equals(code)) {
                return true;
            }
        }
        return false;
    }

    private static String hotp(byte[] secret, long counter, int digits) {
        byte[] counterBytes = ByteBuffer.allocate(8).putLong(counter).array();
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret, "HmacSHA1"));
            byte[] hash = mac.doFinal(counterBytes);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int mod = (int) Math.pow(10, digits);
            int otp = binary % mod;
            return String.format("%0" + digits + "d", otp);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("TOTP generation failed", e);
        }
    }

    /** otpauth:// provisioning URI for QR-code rendering by an authenticator app. */
    public static String provisioningUri(byte[] secret, String issuer, String accountName) {
        String encodedSecret = Base32.encode(secret);
        String label = urlEncode(issuer) + ":" + urlEncode(accountName);
        return "otpauth://totp/" + label
                + "?secret=" + encodedSecret
                + "&issuer=" + urlEncode(issuer)
                + "&algorithm=SHA1&digits=6&period=" + TIME_STEP_SECONDS;
    }

    private static String urlEncode(String s) {
        return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }
}
