package com.shopplatform.common.service;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.shopplatform.common.exception.PaymentGatewayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Thin wrapper around the Razorpay Java SDK, shared by subscription
 * payments (this epic) and customer checkout payments (cart/checkout
 * epic). Razorpay was chosen for low transaction fees (~2%) and a simple,
 * reliable checkout UX for the India/INR market.
 */
@Service
public class PaymentGatewayService {

    private final RazorpayClient razorpayClient;
    private final String keySecret;

    public PaymentGatewayService(RazorpayClient razorpayClient, @Value("${app.razorpay.key-secret}") String keySecret) {
        this.razorpayClient = razorpayClient;
        this.keySecret = keySecret;
    }

    /** Creates a Razorpay order for the given amount (in paise) and returns its order id. */
    public String createOrder(long amountInPaise, String receipt) {
        try {
            JSONObject request = new JSONObject();
            request.put("amount", amountInPaise);
            request.put("currency", "INR");
            request.put("receipt", receipt != null ? receipt : UUID.randomUUID().toString());
            request.put("payment_capture", 1);
            var order = razorpayClient.orders.create(request);
            return order.get("id");
        } catch (RazorpayException e) {
            throw new PaymentGatewayException("Failed to create Razorpay order", e);
        }
    }

    /**
     * Verifies the signature Razorpay returns to the frontend after a
     * successful checkout, proving the payment is genuine and untampered.
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, keySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }
}
