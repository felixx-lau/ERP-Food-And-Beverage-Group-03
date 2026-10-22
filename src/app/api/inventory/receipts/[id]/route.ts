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
    const receipt = await prisma.goodsReceipt.findFirst({
      where: {
        OR: [{ id }, { receiptNumber: id }],
      },
      include: {
        purchaseOrder: {
          include: { vendor: true, lines: true },
        },
        lines: {
          include: { product: true },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Goods Receipt tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    console.error("Fetch receipt detail error:", error);
    return NextResponse.json({ error: "Failed to fetch receipt detail" }, { status: 500 });
  }
}
