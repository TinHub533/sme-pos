package com.smepos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.UUID;

public class ProductDtos {

    public record CreateProductRequest(
            @NotBlank String sku,
            @NotBlank String name,
            BigDecimal priceKhr,
            BigDecimal priceUsd,
            String category,
            @PositiveOrZero Integer initialQty
    ) {}

    public record ProductResponse(
            UUID id,
            String sku,
            String name,
            BigDecimal priceKhr,
            BigDecimal priceUsd,
            String category,
            Integer qtyOnHand
    ) {}
}
