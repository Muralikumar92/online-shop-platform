package com.shopplatform.order.dto;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Shown to the customer when paying MANUAL (UPI/bank transfer/cash directly
 * to the owner). UPI ID (or a GPay-linked phone number) is the primary,
 * preferred method - bank details are optional and only shown as a
 * fallback if the owner has configured them.
 */
public record ManualPaymentInstructions(
    String contactPhone,
    String upiId,
    String upiDeepLink,
    String bankAccountName,
    String bankAccountNumber,
    String bankIfscCode
) {
    /**
     * Builds a standard "upi://pay" deep link that opens directly in any UPI
     * app (GPay, PhonePe, Paytm, etc.) pre-filled with the payee and amount,
     * so the customer just has to confirm and pay - no manual UPI ID entry.
     * Returns null if the shop hasn't configured a UPI ID.
     */
    public static String buildDeepLink(String upiId, String payeeName, long amountInPaise, Long orderId) {
        if (upiId == null || upiId.isBlank()) {
            return null;
        }
        String amountRupees = String.format("%.2f", amountInPaise / 100.0);
        String note = "Order #" + orderId;
        return "upi://pay?pa=" + encode(upiId)
            + "&pn=" + encode(payeeName != null ? payeeName : "Shop")
            + "&am=" + encode(amountRupees)
            + "&cu=INR"
            + "&tn=" + encode(note);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
