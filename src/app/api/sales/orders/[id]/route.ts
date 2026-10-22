import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateSalesOrderLine } from "@/lib/salesEngine";
import { calculateCustomerCreditStatus } from "@/lib/creditControl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const order = await prisma.salesOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        contact: true,
        lead: true,
        lines: { include: { product: true } },
        deliveryOrders: { include: { lines: true } },
        invoices: { include: { lines: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const creditStatus = await calculateCustomerCreditStatus(order.contactId);

    return NextResponse.json({
      success: true,
      order,
      creditStatus,
    });
  } catch (error) {
    console.error("Fetch order detail error:", error);
    return NextResponse.json({ error: "Failed to fetch order detail" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { lineId, quantity, unitPrice, discountPercent } = body;

    const updated = await updateSalesOrderLine({
      orderId: id,
      lineId,
      quantity,
      unitPrice,
      discountPercent,
      actor: user,
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
