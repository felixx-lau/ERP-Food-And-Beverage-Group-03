import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createVendorBill } from "@/lib/purchaseEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bills = await prisma.vendorBill.findMany({
      include: {
        vendor: true,
        purchaseOrder: true,
        lines: { include: { product: true } },
      },
      orderBy: { billDate: "desc" },
    });

    return NextResponse.json({ success: true, bills });
  } catch (error) {
    console.error("Fetch vendor bills error:", error);
    return NextResponse.json({ error: "Failed to fetch vendor bills" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { purchaseOrderId, receiptId, lines } = body;

    if (!purchaseOrderId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Purchase Order ID dan minimal satu baris tagihan wajib disertakan." }, { status: 400 });
    }

    const bill = await createVendorBill({
      purchaseOrderId,
      receiptId,
      lines,
      actor: user,
    });

    return NextResponse.json({ success: true, bill });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
