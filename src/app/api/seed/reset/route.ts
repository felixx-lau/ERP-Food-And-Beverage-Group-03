import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { executeSeed } from "@/lib/seedData";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    // Role-based protection: Only OWNER is allowed to reset the seed baseline
    if (user.role !== Role.OWNER) {
      await recordAuditLog({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "ACCESS_DENIED",
        documentType: "SEED",
        documentId: "BASELINE_RESET",
        notes: `User ${user.name} (${user.role}) unauthorized attempt to reset database seed.`,
      });

      return NextResponse.json(
        {
          error: "Akses ditolak (SR-15). Hanya role Owner yang memiliki hak istimewa untuk mereset database ke Baseline Seed.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirmReset !== true) {
      return NextResponse.json(
        {
          error: "Konfirmasi eksplisit diperlukan. Harap sertakan { confirmReset: true }.",
        },
        { status: 400 }
      );
    }

    // Execute baseline reset
    const result = await executeSeed(prisma, user.name, user.role);

    return NextResponse.json({
      success: true,
      message: "Database berhasil di-reset ke Baseline Seed sesuai spesifikasi tugas.",
      result,
    });
  } catch (error) {
    console.error("Reset seed error:", error);
    return NextResponse.json(
      { error: "Gagal mereset seed database." },
      { status: 500 }
    );
  }
}
