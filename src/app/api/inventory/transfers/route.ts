import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createInternalTransfer } from "@/lib/transferEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transfers = await prisma.internalTransfer.findMany({
      include: {
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, transfers });
  } catch (error) {
    console.error("Fetch transfers error:", error);
    return NextResponse.json({ error: "Failed to fetch internal transfers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sourceLocation, destLocation, lines } = body;

    const transfer = await createInternalTransfer({
      sourceLocation,
      destLocation,
      lines,
      actor: user,
    });

    return NextResponse.json({ success: true, transfer });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
