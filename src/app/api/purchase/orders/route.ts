import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createPurchaseQuotation } from "@/lib/purchaseEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.purchaseOrder.findMany({
      include: {
        vendor: true,
        lines: { include: { product: true } },
        receipts: { include: { lines: true } },
        bills: { include: { lines: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch POs error:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { vendorId, lines, scheduledDate } = body;

    if (!vendorId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Vendor dan minimal satu baris item wajib disertakan." }, { status: 400 });
    }

    const order = await createPurchaseQuotation({
      vendorId,
      lines,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      actor: user,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
