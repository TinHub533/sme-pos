package com.smepos.exception;

import java.util.UUID;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(UUID productId, int available, int requested) {
        super("Product " + productId + " has " + available + " in stock, requested " + requested);
    }
}
