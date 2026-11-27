import { NextResponse } from "next/server";
import { closeAbandonedOrders } from "@/lib/abandoned-orders";

export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>", so set CRON_SECRET in the project's
// environment variables. Without it this route refuses every request.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const closed = await closeAbandonedOrders();
  return NextResponse.json({ ok: true, closed });
}
