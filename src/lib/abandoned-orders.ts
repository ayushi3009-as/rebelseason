import { prisma } from "@/lib/db";
import { ABANDON_AFTER_HOURS } from "@/lib/order-status";

/**
 * Closes website orders that were started but never paid for. No stock or
 * coupon was taken for them (that only happens when payment succeeds), so
 * closing is just a status change. If the customer does pay later, the payment
 * confirmation reopens the order as CONFIRMED.
 */
export async function closeAbandonedOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - ABANDON_AFTER_HOURS * 60 * 60 * 1000);
  const result = await prisma.order.updateMany({
    where: {
      channel: "ONLINE",
      status: "PENDING",
      createdAt: { lt: cutoff },
      OR: [{ payment: { is: null } }, { payment: { status: { in: ["UNPAID", "FAILED"] } } }],
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: `Payment not completed within ${ABANDON_AFTER_HOURS} hours`,
    },
  });
  return result.count;
}
