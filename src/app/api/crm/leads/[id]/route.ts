import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { LeadStage } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const lead = await prisma.crmLead.findUnique({
      where: { id },
      include: {
        contact: true,
        salesOrders: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Fetch lead error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, contactId, expectedRevenue, stage } = body;

    const currentLead = await prisma.crmLead.findUnique({
      where: { id },
    });

    if (!currentLead) {
      return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
    }

    const nextContactId = contactId !== undefined ? contactId : currentLead.contactId;
    const nextRevenue = expectedRevenue !== undefined ? Number(expectedRevenue) : currentLead.expectedRevenue;
    const nextStage = stage !== undefined ? (stage as LeadStage) : currentLead.stage;

    // SR-16 & T-08 Validation Check:
    // Moving to Proposition or Won REQUIRES valid customer and opportunity value > 0
    if ((nextStage === LeadStage.PROPOSITION || nextStage === LeadStage.WON)) {
      if (!nextContactId || nextContactId === "" || !nextRevenue || nextRevenue <= 0) {
        await recordAuditLog({
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: "VALIDATION_FAILED",
          documentType: "CRM_LEAD",
          documentId: id,
          notes: `Gagal memindahkan lead ${id} ke tahap ${nextStage}: Pelanggan atau opportunity value belum diisi (SR-16).`,
        });

        return NextResponse.json(
          {
            error: "Validasi Gagal (SR-16 / F-04): Lead wajib memiliki pelanggan terdaftar dan nilai peluang (opportunity value > 0) sebelum dipindahkan ke tahap Proposition atau Won.",
            currentData: {
              contactId: nextContactId,
              expectedRevenue: nextRevenue,
              attemptedStage: nextStage,
            },
          },
          { status: 400 }
        );
      }
    }

    const beforeState = {
      name: currentLead.name,
      contactId: currentLead.contactId,
      expectedRevenue: currentLead.expectedRevenue,
      stage: currentLead.stage,
    };

    const updated = await prisma.crmLead.update({
      where: { id },
      data: {
        name: name !== undefined ? name : currentLead.name,
        contactId: nextContactId,
        expectedRevenue: nextRevenue,
        stage: nextStage,
      },
      include: {
        contact: true,
      },
    });

    const afterState = {
      name: updated.name,
      contactId: updated.contactId,
      expectedRevenue: updated.expectedRevenue,
      stage: updated.stage,
    };

    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE_LEAD_STAGE",
      documentType: "CRM_LEAD",
      documentId: id,
      beforeState,
      afterState,
      notes: `Lead ${id} berhasil diperbarui (Stage: ${beforeState.stage} -> ${afterState.stage})`,
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
