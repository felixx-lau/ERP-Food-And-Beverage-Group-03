import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const invoice = await prisma.customerInvoice.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        customer: true,
        salesOrder: {
          include: { lines: true, deliveryOrders: { include: { lines: true } } },
        },
        lines: { include: { product: true } },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Customer Invoice tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Fetch invoice detail error:", error);
    return NextResponse.json({ error: "Failed to fetch invoice detail" }, { status: 500 });
  }
}
