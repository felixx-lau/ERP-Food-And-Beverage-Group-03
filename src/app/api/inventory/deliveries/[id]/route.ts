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
    const delivery = await prisma.deliveryOrder.findFirst({
      where: {
        OR: [{ id }, { deliveryNumber: id }],
      },
      include: {
        salesOrder: {
          include: { contact: true },
        },
        lines: {
          include: { product: true },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, delivery });
  } catch (error) {
    console.error("Fetch delivery detail error:", error);
    return NextResponse.json({ error: "Failed to fetch delivery detail" }, { status: 500 });
  }
}
