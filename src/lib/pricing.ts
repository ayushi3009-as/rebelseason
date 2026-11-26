// Shared by the browser and the server so both compute shipping identically.
// The server is always the source of truth for what a customer is charged.

export const FREE_SHIPPING_THRESHOLD = 2000;
// Shipping is charged per item (units, not cart lines): the first item costs
// SHIPPING_BASE_FEE, each additional item adds SHIPPING_EXTRA_ITEM_FEE, and the
// charge never goes above SHIPPING_MAX_FEE.
export const SHIPPING_BASE_FEE = 80;
export const SHIPPING_EXTRA_ITEM_FEE = 30;
export const SHIPPING_MAX_FEE = 150;
export const MAX_QTY_PER_LINE = 10;

// TEMPORARY: set to false while testing Razorpay so every order ships free.
// Set back to true to charge shipping again.
export const SHIPPING_ENABLED = false;

export function shippingFor(subtotal: number, itemCount: number): number {
  if (!SHIPPING_ENABLED || itemCount < 1 || subtotal > FREE_SHIPPING_THRESHOLD) return 0;
  const fee = SHIPPING_BASE_FEE + (itemCount - 1) * SHIPPING_EXTRA_ITEM_FEE;
  return Math.min(fee, SHIPPING_MAX_FEE);
}
