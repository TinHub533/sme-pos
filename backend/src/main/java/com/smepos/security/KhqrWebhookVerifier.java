package com.smepos.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Verifies the shared-secret HMAC-SHA256 signature on incoming KHQR webhook
 * calls (see PaymentWebhookController). Without this, /webhooks/khqr/** is
 * wide open: anyone who learns or guesses a khqrRef could POST
 * bankStatus=SUCCESS and mark an order paid with no money having moved.
 *
 * The exact scheme (header name, algorithm, whether the secret is global or
 * per-merchant) should be replaced with whatever your real KHQR provider's
 * webhook security spec actually requires — this is the generic version of
 * the pattern most gateways use (Stripe, PayWay, etc), not any specific
 * provider's real contract.
 */
@Component
public class KhqrWebhookVerifier {

    private final SecretKeySpec key;

    public KhqrWebhookVerifier(@Value("${khqr.webhook-secret}") String secret) {
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public boolean isValid(String rawBody, String providedSignatureHex) {
        if (providedSignatureHex == null || providedSignatureHex.isBlank()) return false;
        String expected = hex(rawBody);
        // Constant-time comparison: a naive .equals() leaks timing
        // information an attacker could use to guess the signature
        // byte-by-byte.
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                providedSignatureHex.getBytes(StandardCharsets.UTF_8));
    }

    private String hex(String rawBody) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            byte[] hash = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Could not compute webhook HMAC", e);
        }
    }
}
