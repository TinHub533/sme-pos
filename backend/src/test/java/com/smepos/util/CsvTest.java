package com.smepos.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CsvTest {

    @Test
    void plainFieldsAreNotQuoted() {
        assertEquals("a,b,3\r\n", Csv.row("a", "b", 3));
    }

    @Test
    void nullBecomesEmptyField() {
        assertEquals("a,,c\r\n", Csv.row("a", null, "c"));
    }

    @Test
    void commaInFieldTriggersQuoting() {
        assertEquals("\"Acme, Inc\",5\r\n", Csv.row("Acme, Inc", 5));
    }

    @Test
    void embeddedQuoteIsDoubledAndFieldIsQuoted() {
        assertEquals("\"She said \"\"hi\"\"\"\r\n", Csv.row("She said \"hi\""));
    }

    @Test
    void newlineInFieldTriggersQuoting() {
        assertEquals("\"line1\nline2\"\r\n", Csv.row("line1\nline2"));
    }

    @Test
    void multipleRowsConcatenateWithCrlf() {
        String result = Csv.row("a", "b") + Csv.row("c", "d");
        assertEquals("a,b\r\nc,d\r\n", result);
    }
}
