package com.smepos.controller;

import com.smepos.dto.PageResponse;
import com.smepos.dto.ProductDtos.CreateProductRequest;
import com.smepos.dto.ProductDtos.ProductResponse;
import com.smepos.security.CurrentUser;
import com.smepos.service.ProductService;
import com.smepos.util.Csv;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // Default page size is deliberately generous (100): this one endpoint
    // serves both the Products management table (which asks for a real
    // page, e.g. ?size=20) and the POS screen (which asks for ?size=1000 to
    // get the whole catalog at once for its client-side instant search — see
    // pos/page.tsx). A shop with a catalog too large for that to hold would
    // need POS switched to server-side search instead; not needed at
    // typical SME retailer catalog sizes.
    @GetMapping
    public PageResponse<ProductResponse> list(@PageableDefault(size = 100, sort = "name") Pageable pageable) {
        return PageResponse.from(productService.listActive(CurrentUser.shopId(), pageable));
    }

    // Only shop owners create catalog entries — cashiers can sell, not stock.
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ProductResponse create(@Valid @RequestBody CreateProductRequest request) {
        return productService.createProduct(CurrentUser.shopId(), request);
    }

    // Reporting/back-office, same access tier as /closing — cashiers ring up
    // sales, they don't pull stock reports.
    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/low-stock/export")
    public ResponseEntity<byte[]> exportLowStock() {
        return Csv.download(productService.exportLowStockCsv(CurrentUser.shopId()), "low-stock.csv");
    }
}
