package com.smepos.util;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * RFC 4180-style CSV row building. Hand-rolled rather than a dependency —
 * the escaping rule is a single, well-specified thing (quote a field, and
 * double any embedded quotes, only if it contains a comma/quote/newline),
 * see CsvTest for the cases this actually has to get right (a product or
 * shop name can genuinely contain a comma).
 */
public final class Csv {

    private Csv() {}

    public static String row(Object... fields) {
        return Arrays.stream(fields)
                .map(f -> escape(f == null ? "" : String.valueOf(f)))
                .collect(Collectors.joining(",")) + "\r\n";
    }

    private static String escape(String field) {
        boolean needsQuoting = field.contains(",") || field.contains("\"")
                || field.contains("\n") || field.contains("\r");
        if (!needsQuoting) {
            return field;
        }
        return "\"" + field.replace("\"", "\"\"") + "\"";
    }

    /** Wraps CSV bytes as a downloadable attachment response — shared by every export endpoint. */
    public static ResponseEntity<byte[]> download(byte[] content, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return new ResponseEntity<>(content, headers, org.springframework.http.HttpStatus.OK);
    }
}
