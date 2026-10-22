import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCustomerCreditStatus } from "@/lib/creditControl";

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
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        salesOrders: {
          take: 5,
          orderBy: { orderDate: "desc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    let creditStatus = null;
    if (contact.type === "CUSTOMER") {
      creditStatus = await calculateCustomerCreditStatus(contact.id);
    }

    return NextResponse.json({
      success: true,
      contact,
      creditStatus,
    });
  } catch (error) {
    console.error("Fetch contact detail error:", error);
    return NextResponse.json({ error: "Failed to fetch contact detail" }, { status: 500 });
  }
}
