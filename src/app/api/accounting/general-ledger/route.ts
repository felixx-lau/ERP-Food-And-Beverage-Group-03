import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan. Harap login terlebih dahulu." },
        { status: 401 }
      );
    }

    // SR-15 & T-02: Access restricted to FINANCE and OWNER only
    if (user.role !== Role.FINANCE && user.role !== Role.OWNER) {
      await recordAuditLog({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "ACCESS_DENIED",
        documentType: "GENERAL_LEDGER",
        documentId: "GL_REPORT",
        notes: `Penolakan akses: Pengguna ${user.name} (${user.role}) mencoba mengakses General Ledger tanpa wewenang Finance/Owner.`,
      });

      return NextResponse.json(
        {
          error: "Akses Ditolak (SR-15 / F-01): General Ledger hanya dapat diakses oleh role Finance atau Owner.",
          requiredRoles: [Role.FINANCE, Role.OWNER],
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    // If authorized (Finance / Owner), return Chart of Accounts & Journal Entries
    const accounts = await prisma.account.findMany({
      orderBy: { code: "asc" },
    });

    const journalEntries = await prisma.journalEntry.findMany({
      include: {
        items: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      accounts,
      journalEntries,
    });
  } catch (error) {
    console.error("General ledger error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
