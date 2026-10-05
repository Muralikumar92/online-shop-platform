import type { ManualPaymentInstructions } from "@/lib/types";
import { formatPaise } from "@/lib/types";

/**
 * Shows manual/offline payment instructions to the customer, prioritizing a
 * one-tap UPI deep link (opens GPay/PhonePe/Paytm/etc. pre-filled with the
 * payee and amount) over raw bank details, which are only shown as a
 * fallback when the shop hasn't set up a UPI ID.
 */
export default function ManualPaymentInfo({
  instructions,
  amountInPaise,
}: {
  instructions: ManualPaymentInstructions;
  amountInPaise: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <p className="font-medium">Amount to pay: {formatPaise(amountInPaise)}</p>

      {instructions.upiId && (
        <div className="flex flex-col gap-2">
          <p>
            UPI ID: <span className="font-medium">{instructions.upiId}</span>
          </p>
          {instructions.upiDeepLink && (
            <a
              href={instructions.upiDeepLink}
              className="rounded-xl bg-accent py-2.5 text-center text-sm font-semibold text-accent-foreground"
            >
              Pay via UPI app (GPay / PhonePe / Paytm)
            </a>
          )}
        </div>
      )}

      {instructions.contactPhone && (
        <p>
          Contact: <span className="font-medium">{instructions.contactPhone}</span>
        </p>
      )}

      {!instructions.upiId && instructions.bankAccountName && (
        <>
          <p className="mt-1 font-medium">Bank transfer details</p>
          <p>Account holder: {instructions.bankAccountName}</p>
          <p>Account number: {instructions.bankAccountNumber}</p>
          <p>IFSC: {instructions.bankIfscCode}</p>
        </>
      )}

      {!instructions.upiId && !instructions.bankAccountName && (
        <p className="text-muted">
          The shop hasn&apos;t added UPI or bank details yet - please contact them using the phone number above to
          arrange payment.
        </p>
      )}
    </div>
  );
}
