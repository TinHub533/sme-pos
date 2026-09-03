package com.smepos.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smepos.entity.Order;
import com.smepos.entity.Payment;
import com.smepos.repository.OrderRepository;
import com.smepos.repository.PaymentRepository;
import com.smepos.security.KhqrWebhookVerifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks/khqr")
public class PaymentWebhookController {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final KhqrWebhookVerifier webhookVerifier;
    private final ObjectMapper objectMapper;

    public PaymentWebhookController(PaymentRepository paymentRepository, OrderRepository orderRepository,
                                     KhqrWebhookVerifier webhookVerifier, ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.webhookVerifier = webhookVerifier;
        this.objectMapper = objectMapper;
    }

    public record PaymentConfirmRequest(String khqrRef, String bankStatus) {}

    /**
     * Bank/gateway calls this when a KHQR payment settles. Banks retry
     * webhooks on timeout, so this MUST be idempotent: replaying the same
     * khqrRef twice must not double-credit the order or fire downstream
     * events (receipt print, stock already decremented at addItem time so
     * no risk there, but a naive implementation could still e.g. send two
     * "order paid" notifications).
     *
     * The guard is simple: if the payment is already CONFIRMED, return 200
     * immediately without touching anything else. This is checked and
     * updated inside a single transaction, with the read taking a
     * pessimistic row lock (findByKhqrRefForUpdate) specifically so two
     * near-simultaneous retries can't both pass the check before either
     * writes — a plain (unlocked) read here let every concurrent replay of
     * the same webhook see PENDING and all report "confirmed" back, proven
     * by CheckoutAndBootstrapConcurrencyIT before this lock was added.
     *
     * Takes the body as a raw String rather than binding straight to
     * PaymentConfirmRequest: the HMAC signature (see KhqrWebhookVerifier)
     * has to be computed over the exact bytes the caller sent, which isn't
     * available anymore once Spring's HttpMessageConverter has already
     * deserialized it into an object.
     */
    @PostMapping("/payment-confirm")
    @Transactional
    public ResponseEntity<String> confirmPayment(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Khqr-Signature", required = false) String signature) {

        if (!webhookVerifier.isValid(rawBody, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("invalid signature");
        }

        PaymentConfirmRequest req;
        try {
            req = objectMapper.readValue(rawBody, PaymentConfirmRequest.class);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("malformed body");
        }

        if (req.khqrRef() == null || req.khqrRef().isBlank()) {
            // A blank/missing ref would otherwise reach
            // findByKhqrRef(null), which Spring Data translates to
            // "WHERE khqr_ref IS NULL" — matching every STATIC-mode
            // Payment at once (they all have a null khqrRef by design,
            // see OrderService#checkoutKhqr) and throwing on the
            // single-result Optional<Payment> return type. STATIC-mode
            // payments are never meant to reach this endpoint at all — they
            // confirm via OrderService#confirmKhqrManually instead.
            return ResponseEntity.badRequest().body("khqrRef is required");
        }

        Payment payment = paymentRepository.findByKhqrRefForUpdate(req.khqrRef())
                .orElse(null);

        if (payment == null) {
            // Unknown reference — don't 500, a stray webhook shouldn't
            // alert on-call. Log and ack.
            return ResponseEntity.ok("ignored: unknown reference");
        }

        if (payment.getStatus() == Payment.Status.CONFIRMED) {
            // Already processed — this is the idempotent replay case.
            return ResponseEntity.ok("already confirmed");
        }

        if (!"SUCCESS".equals(req.bankStatus())) {
            payment.setStatus(Payment.Status.FAILED);
            paymentRepository.save(payment);
            return ResponseEntity.ok("marked failed");
        }

        payment.setStatus(Payment.Status.CONFIRMED);
        paymentRepository.save(payment);

        Order order = orderRepository.findById(payment.getOrderId())
                .orElseThrow(() -> new IllegalStateException("Order missing for payment " + payment.getId()));
        order.setStatus(Order.Status.PAID);
        orderRepository.save(order);

        return ResponseEntity.ok("confirmed");
    }
}
