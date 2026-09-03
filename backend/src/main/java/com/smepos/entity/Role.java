package com.smepos.entity;

public enum Role {
    ADMIN,   // platform operator — manages shops across the whole system
    OWNER,   // manages one shop: catalog, inventory, staff, reconciliation
    CASHIER  // runs the POS: builds orders, checks out, views own shift
}
