import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createCustomerInvoice } from "@/lib/accountingEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoices = await prisma.customerInvoice.findMany({
      include: {
        customer: true,
        salesOrder: true,
        lines: { include: { product: true } },
        payments: true,
      },
      orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { salesOrderId, deliveryOrderId, lines } = body;

    if (!salesOrderId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Sales Order ID dan baris item tagihan wajib disertakan." }, { status: 400 });
    }

    const invoice = await createCustomerInvoice({
      salesOrderId,
      deliveryOrderId,
      lines,
      actor: user,
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
