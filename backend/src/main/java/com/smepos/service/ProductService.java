package com.smepos.service;

import com.smepos.dto.ProductDtos.CreateProductRequest;
import com.smepos.dto.ProductDtos.ProductResponse;
import com.smepos.entity.Inventory;
import com.smepos.entity.Product;
import com.smepos.repository.InventoryRepository;
import com.smepos.repository.ProductRepository;
import com.smepos.util.Csv;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class ProductService implements OrderService.ProductPriceLookup {

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryService inventoryService;

    public ProductService(ProductRepository productRepository,
                           InventoryRepository inventoryRepository,
                           InventoryService inventoryService) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public ProductResponse createProduct(UUID shopId, CreateProductRequest req) {
        Product product = productRepository.save(
                new Product(shopId, req.sku(), req.name(), req.priceKhr(), req.priceUsd(), req.category()));

        int initialQty = req.initialQty() == null ? 0 : req.initialQty();
        Inventory inventory = inventoryService.createInitialRow(product.getId(), initialQty, 0);

        return toResponse(product, inventory.getQtyOnHand());
    }

    public Page<ProductResponse> listActive(UUID shopId, Pageable pageable) {
        return productRepository.findByShopIdAndActiveTrue(shopId, pageable)
                .map(p -> toResponse(p, inventoryRepository.findByProductId(p.getId())
                        .map(Inventory::getQtyOnHand).orElse(0)));
    }

    /**
     * Implements OrderService.ProductPriceLookup. Deliberately simple for
     * now: always quotes USD. A real dual-currency POS would take the
     * requested currency as a parameter and fall back to an fx-converted
     * price — flagged here rather than silently baked in, since it's a
     * product decision as much as a technical one.
     *
     * Returns the name alongside the price (one lookup, not two) so
     * OrderItem can snapshot both at add-to-cart time — see
     * OrderItem.productNameSnapshot's javadoc-equivalent comment.
     */
    @Override
    public OrderService.ProductPriceLookup.Snapshot currentSnapshot(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        if (product.getPriceUsd() == null) {
            throw new IllegalStateException("Product " + productId + " has no USD price set");
        }
        return new OrderService.ProductPriceLookup.Snapshot(product.getPriceUsd(), product.getName());
    }

    public byte[] exportLowStockCsv(UUID shopId) {
        StringBuilder sb = new StringBuilder();
        sb.append(Csv.row("SKU", "Product", "Qty on hand", "Reorder threshold"));
        for (Inventory inv : inventoryRepository.findLowStockByShop(shopId)) {
            Product product = productRepository.findById(inv.getProductId()).orElse(null);
            sb.append(Csv.row(
                    product == null ? "" : product.getSku(),
                    product == null ? "(unknown product)" : product.getName(),
                    inv.getQtyOnHand(),
                    inv.getReorderThreshold()));
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private ProductResponse toResponse(Product p, int qtyOnHand) {
        return new ProductResponse(p.getId(), p.getSku(), p.getName(), p.getPriceKhr(), p.getPriceUsd(),
                p.getCategory(), qtyOnHand);
    }
}
