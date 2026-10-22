import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSalesQuotation } from "@/lib/salesEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.salesOrder.findMany({
      include: {
        contact: true,
        lines: { include: { product: true } },
        deliveryOrders: true,
        invoices: true,
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { contactId, leadId, lines, paymentTerms } = body;

    if (!contactId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Pelanggan dan minimal satu baris item wajib diisi." }, { status: 400 });
    }

    const order = await createSalesQuotation({
      contactId,
      leadId,
      lines,
      paymentTerms,
      actor: user,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
