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
    const bill = await prisma.vendorBill.findFirst({
      where: {
        OR: [{ id }, { billNumber: id }],
      },
      include: {
        vendor: true,
        purchaseOrder: {
          include: { lines: true, receipts: { include: { lines: true } } },
        },
        lines: {
          include: { product: true },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Vendor Bill tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, bill });
  } catch (error) {
    console.error("Fetch bill detail error:", error);
    return NextResponse.json({ error: "Failed to fetch bill detail" }, { status: 500 });
  }
}
