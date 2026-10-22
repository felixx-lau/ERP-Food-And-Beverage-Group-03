import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { registerCustomerPayment } from "@/lib/accountingEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payments = await prisma.payment.findMany({
      include: {
        customer: true,
        vendor: true,
        invoice: true,
        bill: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error("Fetch payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoiceId, paymentMethod, amount, paymentDate, notes } = body;

    if (!invoiceId || amount === undefined || typeof amount !== "number") {
      return NextResponse.json({ error: "invoiceId dan amount pembayaran wajib disertakan." }, { status: 400 });
    }

    const result = await registerCustomerPayment({
      invoiceId,
      paymentMethod: paymentMethod || "BANK",
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      notes,
      actor: user,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
