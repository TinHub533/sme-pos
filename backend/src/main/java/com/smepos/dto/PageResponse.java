package com.smepos.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Hand-rolled instead of serializing Spring Data's Page/PageImpl directly:
 * Spring Boot 3 logs a warning that PageImpl's JSON shape "is not
 * guaranteed to be stable" and recommends PagedModel from spring-hateoas —
 * which this project doesn't otherwise depend on. A plain record matches
 * every other DTO in this package and gives a fixed, predictable shape.
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
