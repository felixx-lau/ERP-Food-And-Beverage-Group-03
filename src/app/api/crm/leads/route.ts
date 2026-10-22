import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { getNextSequence } from "@/lib/sequences";
import { LeadStage } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.crmLead.findMany({
      include: {
        contact: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error("Fetch CRM leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, contactId, expectedRevenue, stage } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama lead wajib diisi." }, { status: 400 });
    }

    const nextId = await getNextSequence("LEAD");

    const lead = await prisma.crmLead.create({
      data: {
        id: nextId,
        name,
        contactId: contactId || "C01", // fallback default if initial draft
        expectedRevenue: expectedRevenue ? Number(expectedRevenue) : 0,
        stage: stage || LeadStage.NEW,
      },
      include: {
        contact: true,
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE_LEAD",
      documentType: "CRM_LEAD",
      documentId: lead.id,
      afterState: { name: lead.name, contactId: lead.contactId, expectedRevenue: lead.expectedRevenue, stage: lead.stage },
      notes: `Lead ${lead.id} (${lead.name}) berhasil dibuat.`,
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
