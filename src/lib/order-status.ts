// Plain-language labels for orders whose payment never completed. Safe to use
// in the browser and on the server (no database access here).

/** An unpaid website order is closed automatically after this many hours. */
export const ABANDON_AFTER_HOURS = 24;

export type PaymentIssue = {
  kind: "awaiting" | "failed" | "abandoned";
  label: string;
  /** Tailwind classes for the admin badge. */
  adminClass: string;
};

/**
 * Returns a clearer label when the order's money never arrived, or null when
 * the normal order status should be shown. `audience` picks the wording:
 * the owner sees "Abandoned", the customer sees "Not completed".
 */
export function paymentIssue(
  status: string,
  paymentStatus: string | null | undefined,
  audience: "admin" | "customer" = "admin"
): PaymentIssue | null {
  const unpaid = !paymentStatus || paymentStatus === "UNPAID" || paymentStatus === "FAILED";
  if (status === "PENDING") {
    if (paymentStatus === "FAILED") {
      return { kind: "failed", label: "Payment failed", adminClass: "bg-orange-50 text-orange-700 ring-orange-600/20" };
    }
    return { kind: "awaiting", label: "Awaiting payment", adminClass: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" };
  }
  if (status === "CANCELLED" && unpaid) {
    return {
      kind: "abandoned",
      label: audience === "admin" ? "Abandoned" : "Not completed",
      adminClass: "bg-gray-100 text-gray-600 ring-gray-500/20",
    };
  }
  return null;
}
