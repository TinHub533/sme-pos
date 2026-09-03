package com.smepos.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Wraps whichever KHQR-issuing bank API you integrate against (ABA PayWay,
 * Wing, ACLEDA, etc) for GATEWAY-mode shops (see KhqrMode) — STATIC-mode
 * shops never call this at all. Real implementation calls out over HTTP and
 * returns the bank's own transaction reference; this stub fakes that
 * reference so the rest of the flow is testable without a live bank
 * sandbox.
 *
 * The QR payload below is still NOT a real EMV-QR/Bakong-compliant code —
 * deliberately left as an obvious placeholder rather than a hand-built
 * approximation of the spec (merchant info fields, CRC checksum, etc). A
 * plausible-looking-but-wrong payload would silently fail to scan in a real
 * banking app while looking finished; an honest placeholder doesn't.
 */
@Service
public class KhqrPaymentService {

    private final BigDecimal usdToKhrRate;

    public KhqrPaymentService(@Value("${khqr.usd-to-khr-rate}") BigDecimal usdToKhrRate) {
        this.usdToKhrRate = usdToKhrRate;
    }

    public record KhqrQuote(String khqrRef, String qrPayload) {}

    public KhqrQuote generateQr(UUID orderId, BigDecimal amountUsd, String currency) {
        String ref = "KHQR-" + orderId.toString().substring(0, 8) + "-" + System.currentTimeMillis();

        // Order totals are always USD-denominated (see ProductService's
        // currentPrice javadoc) — convert for display when KHR is
        // requested rather than encoding the raw USD figure mislabeled as
        // KHR, which is what this did before.
        BigDecimal displayAmount = "KHR".equalsIgnoreCase(currency)
                ? amountUsd.multiply(usdToKhrRate).setScale(0, RoundingMode.HALF_UP)
                : amountUsd;

        String payload = "00020101021126...amount=" + displayAmount + currency; // real EMV-QR build goes here
        return new KhqrQuote(ref, payload);
    }
}
