package com.smepos.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    public enum Method { CASH, BANK, KHQR }
    public enum Status { PENDING, CONFIRMED, FAILED }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    private Method method;

    // The bank/gateway's own reference for this KHQR transaction.
    // Unique so a retried webhook can't create a second payment row.
    @Column(name = "khqr_ref", unique = true)
    private String khqrRef;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    protected Payment() {}

    public Payment(UUID orderId, Method method, String khqrRef) {
        this.orderId = orderId;
        this.method = method;
        this.khqrRef = khqrRef;
    }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public Method getMethod() { return method; }
    public String getKhqrRef() { return khqrRef; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
