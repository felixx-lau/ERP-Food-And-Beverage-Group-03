import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // SR-15: General Ledger and Journal Entries restricted to FINANCE and OWNER
    if (user.role !== Role.FINANCE && user.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Akses Ditolak (SR-15): Akses Journal Entries dibatasi khusus untuk Finance dan Owner." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sourceDocument = searchParams.get("sourceDocument");
    const journalType = searchParams.get("journalType");

    const where: Record<string, unknown> = {};
    if (sourceDocument) where.sourceDocument = sourceDocument;
    if (journalType) where.journalType = journalType;

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        items: {
          include: { account: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = entries.map((entry) => {
      const totalDebit = entry.items.reduce((sum, i) => sum + i.debit, 0);
      const totalCredit = entry.items.reduce((sum, i) => sum + i.credit, 0);
      const isBalanced = totalDebit === totalCredit;

      return {
        ...entry,
        totalDebit,
        totalCredit,
        isBalanced,
      };
    });

    return NextResponse.json({ success: true, entries: enriched });
  } catch (error) {
    console.error("Fetch journal entries error:", error);
    return NextResponse.json({ error: "Failed to fetch journal entries" }, { status: 500 });
  }
}
