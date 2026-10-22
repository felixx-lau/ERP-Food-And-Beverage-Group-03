import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCustomerCreditStatus } from "@/lib/creditControl";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // CUSTOMER or VENDOR

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { id: "asc" },
    });

    // If fetching customers, enrich with live credit status
    const enriched = await Promise.all(
      contacts.map(async (c) => {
        if (c.type === "CUSTOMER") {
          const status = await calculateCustomerCreditStatus(c.id);
          return {
            ...c,
            creditExposure: status.creditExposure,
            creditHeadroom: status.creditHeadroom,
            grossConfirmedUninvoiced: status.grossConfirmedUninvoiced,
          };
        }
        return c;
      })
    );

    return NextResponse.json({ success: true, contacts: enriched });
  } catch (error) {
    console.error("Fetch contacts error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}
