import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { createSessionToken, getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { role, userId } = await request.json();
    const prevUser = await getCurrentUser();

    let targetUser = null;
    if (userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });
    }

    if (!targetUser && role) {
      if (!Object.values(Role).includes(role as Role)) {
        return NextResponse.json(
          { error: "Role tidak valid." },
          { status: 400 }
        );
      }
      targetUser = await prisma.user.findFirst({
        where: { role: role as Role },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: `User tidak ditemukan.` },
        { status: 404 }
      );
    }

    const sessionUser = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
    };

    const token = await createSessionToken(sessionUser);

    await recordAuditLog({
      actorId: targetUser.id,
      actorName: targetUser.name,
      actorRole: targetUser.role,
      action: "SWITCH_ROLE",
      documentType: "AUTH",
      documentId: targetUser.id,
      notes: `Active role switched to ${role} (previous user: ${prevUser?.name || "None"})`,
    });

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set("rasa_aruna_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Switch role error:", error);
    return NextResponse.json(
      { error: "Gagal mengganti role." },
      { status: 500 }
    );
  }
}
