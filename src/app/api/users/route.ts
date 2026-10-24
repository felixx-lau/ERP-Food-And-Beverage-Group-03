import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, role, password = "password123" } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Nama lengkap, email, dan role wajib diisi." },
        { status: 400 }
      );
    }

    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { error: `Role tidak valid. Harus salah satu dari: ${Object.values(Role).join(", ")}` },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Pengguna dengan email ${cleanEmail} sudah ada.` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        role: role as Role,
        passwordHash,
      },
    });

    await recordAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: "CREATE_USER",
      documentType: "USER",
      documentId: newUser.id,
      notes: `Anggota tim baru ditambahkan: ${name} (${role}) - ${cleanEmail}`,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message || "Gagal membuat user." }, { status: 500 });
  }
}
