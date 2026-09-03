package com.smepos.service;

import com.smepos.entity.Inventory;
import com.smepos.entity.StockMovement;
import com.smepos.exception.InsufficientStockException;
import com.smepos.repository.InventoryRepository;
import com.smepos.repository.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;

    public InventoryService(InventoryRepository inventoryRepository,
                             StockMovementRepository stockMovementRepository) {
        this.inventoryRepository = inventoryRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    /**
     * Decrements stock for a sale and appends the audit ledger entry in the
     * same transaction. Runs in its own transaction (REQUIRES_NEW) so the
     * row lock acquired by findByProductIdForUpdate is held only for the
     * lifetime of this method — not for however long the calling
     * OrderService.addItem transaction happens to run. This is the fix for
     * exactly the bug class you get from calling lockForUpdate() outside a
     * transaction boundary: the lock's scope has to be explicit and tight,
     * or you either under-lock (races survive) or over-lock (throughput
     * collapses under concurrent checkouts).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void decrementForSale(UUID productId, int qty, UUID actorId) {
        Inventory inventory = inventoryRepository.findByProductIdForUpdate(productId)
                .orElseThrow(() -> new IllegalStateException("No inventory row for product " + productId));

        if (inventory.getQtyOnHand() < qty) {
            throw new InsufficientStockException(productId, inventory.getQtyOnHand(), qty);
        }

        inventory.setQtyOnHand(inventory.getQtyOnHand() - qty);
        inventoryRepository.save(inventory);

        stockMovementRepository.save(
                new StockMovement(productId, actorId, StockMovement.Type.SALE, -qty, "order checkout"));
    }

    /** Reversal path — used when a paid-but-not-yet-fulfilled order is voided. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void restock(UUID productId, int qty, UUID actorId, String reason) {
        Inventory inventory = inventoryRepository.findByProductIdForUpdate(productId)
                .orElseThrow(() -> new IllegalStateException("No inventory row for product " + productId));
        inventory.setQtyOnHand(inventory.getQtyOnHand() + qty);
        inventoryRepository.save(inventory);

        stockMovementRepository.save(
                new StockMovement(productId, actorId, StockMovement.Type.RESTOCK, qty, reason));
    }

    /** Manual count correction — positive or negative delta. */
    @Transactional
    public void adjust(UUID productId, int delta, UUID actorId, String reason) {
        Inventory inventory = inventoryRepository.findByProductIdForUpdate(productId)
                .orElseThrow(() -> new IllegalStateException("No inventory row for product " + productId));
        int newQty = inventory.getQtyOnHand() + delta;
        if (newQty < 0) {
            throw new InsufficientStockException(productId, inventory.getQtyOnHand(), -delta);
        }
        inventory.setQtyOnHand(newQty);
        inventoryRepository.save(inventory);

        stockMovementRepository.save(
                new StockMovement(productId, actorId, StockMovement.Type.ADJUSTMENT, delta, reason));
    }

    @Transactional
    public Inventory createInitialRow(UUID productId, int initialQty, int reorderThreshold) {
        return inventoryRepository.save(new Inventory(productId, initialQty, reorderThreshold));
    }
}
