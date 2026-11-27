import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrderById } from "@/lib/dal/orders";
import { OrderStatus } from "@prisma/client";
import { sendShippingNotificationEmail } from "@/lib/mail";
import { getAdminSession } from "@/lib/auth";
import { revalidateCatalog } from "@/lib/cache";
import { restoreStockForOrder } from "@/lib/pos/stock";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: OrderStatus };
    const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
    const trackingUrl = typeof body.trackingUrl === "string" ? body.trackingUrl.trim() : "";

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Shop bills are cancelled at the POS (by a manager), where the cash drawer is kept right.
    if (existingOrder.channel === "POS") {
      return NextResponse.json({ error: "Shop bills are managed in the POS, not here." }, { status: 400 });
    }
    // A cancelled order has already put its stock back; reopening it would count that stock twice.
    if (existingOrder.status === "CANCELLED" && status !== "CANCELLED") {
      return NextResponse.json({ error: "A cancelled order can't be reopened. Ask the customer to place a new order." }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === "SHIPPED") {
      if (!trackingNumber) {
        return NextResponse.json({ error: "Enter the tracking number." }, { status: 400 });
      }
      if (trackingNumber.length > 60) {
        return NextResponse.json({ error: "The tracking number is too long." }, { status: 400 });
      }
      if (trackingUrl && !/^https?:\/\/\S+$/i.test(trackingUrl)) {
        return NextResponse.json({ error: "The tracking page link must start with http:// or https://" }, { status: 400 });
      }
      updateData.trackingNumber = trackingNumber;
      updateData.trackingUrl = trackingUrl || null;
    }

    // Cancelling an order that was already paid puts its pieces back on the shelf (shop and website).
    const returnsStock = status === "CANCELLED" && existingOrder.status !== "CANCELLED" && existingOrder.payment?.status === "CAPTURED";
    const admin = await getAdminSession();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          items: true,
          payment: true,
        },
      });
      if (returnsStock) {
        await restoreStockForOrder(tx, id, { userId: admin.userId ?? null, note: `Order ${existingOrder.orderNumber} cancelled` });
      }
      return updated;
    });
    if (returnsStock) revalidateCatalog();

    if (status === "SHIPPED" && updatedOrder.customerEmail) {
      await sendShippingNotificationEmail(updatedOrder.customerEmail, updatedOrder, { trackingNumber, trackingUrl: trackingUrl || null });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
