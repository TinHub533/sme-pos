package com.smepos.security;

import java.io.ByteArrayOutputStream;

/**
 * RFC 4648 §6 Base32, unpadded. Hand-rolled rather than pulling in
 * commons-codec (or similar) for one small, well-specified algorithm — see
 * Base32Test for verification against the RFC's own test vectors. Used only
 * for TOTP secrets (RFC 6238 mandates base32 for the shared secret in
 * provisioning URIs), so no padding handling is needed beyond decode()
 * tolerating it if present.
 */
public final class Base32 {

    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private Base32() {}

    public static String encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int bits = 0;
        int value = 0;
        for (byte b : data) {
            value = (value << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                sb.append(ALPHABET.charAt((value >>> (bits - 5)) & 0x1F));
                bits -= 5;
            }
        }
        if (bits > 0) {
            sb.append(ALPHABET.charAt((value << (5 - bits)) & 0x1F));
        }
        return sb.toString();
    }

    public static byte[] decode(String encoded) {
        String clean = encoded.trim().toUpperCase().replace("=", "");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int bits = 0;
        int value = 0;
        for (char c : clean.toCharArray()) {
            int idx = ALPHABET.indexOf(c);
            if (idx < 0) {
                continue;
            }
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                out.write((value >>> (bits - 8)) & 0xFF);
                bits -= 8;
            }
        }
        return out.toByteArray();
    }
}
