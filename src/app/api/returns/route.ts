import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createReturnRequest } from "@/lib/returnEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const returns = await prisma.returnRequest.findMany({
      include: {
        customer: true,
        invoice: true,
        lines: { include: { product: true } },
        creditNotes: true,
      },
      orderBy: { returnDate: "desc" },
    });

    return NextResponse.json({ success: true, returns });
  } catch (error) {
    console.error("Fetch returns error:", error);
    return NextResponse.json({ error: "Failed to fetch returns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoiceId, lines } = body;

    const returnReq = await createReturnRequest({
      invoiceId,
      lines,
      actor: user,
    });

    return NextResponse.json({ success: true, returnRequest: returnReq });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
