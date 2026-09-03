package com.smepos.security;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

// Official test vectors from RFC 4648 §10 — proves the hand-rolled Base32
// implementation is spec-correct rather than just "looks plausible".
class Base32Test {

    @Test
    void encodesRfc4648TestVectors() {
        assertEquals("", Base32.encode(bytes("")));
        assertEquals("MY", Base32.encode(bytes("f")));
        assertEquals("MZXQ", Base32.encode(bytes("fo")));
        assertEquals("MZXW6", Base32.encode(bytes("foo")));
        assertEquals("MZXW6YQ", Base32.encode(bytes("foob")));
        assertEquals("MZXW6YTB", Base32.encode(bytes("fooba")));
        assertEquals("MZXW6YTBOI", Base32.encode(bytes("foobar")));
    }

    @Test
    void decodesRfc4648TestVectorsRoundTrip() {
        assertArrayEquals(bytes(""), Base32.decode(""));
        assertArrayEquals(bytes("f"), Base32.decode("MY======"));
        assertArrayEquals(bytes("fo"), Base32.decode("MZXQ===="));
        assertArrayEquals(bytes("foo"), Base32.decode("MZXW6==="));
        assertArrayEquals(bytes("foob"), Base32.decode("MZXW6YQ="));
        assertArrayEquals(bytes("fooba"), Base32.decode("MZXW6YTB"));
        assertArrayEquals(bytes("foobar"), Base32.decode("MZXW6YTBOI======"));
    }

    @Test
    void decodeToleratesLowercaseAndMissingPadding() {
        assertArrayEquals(bytes("foobar"), Base32.decode("mzxw6ytboi"));
    }

    private static byte[] bytes(String s) {
        return s.getBytes(StandardCharsets.US_ASCII);
    }
}
