import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createPosOrder } from "@/lib/posEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.posOrder.findMany({
      include: {
        session: true,
        lines: { include: { product: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch POS orders error:", error);
    return NextResponse.json({ error: "Failed to fetch POS orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sessionId, locationCode, tableInfo, paymentMethod, lines } = body;

    const result = await createPosOrder({
      sessionId,
      locationCode,
      tableInfo,
      paymentMethod,
      lines,
      actor: user,
    });

    return NextResponse.json({ ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
