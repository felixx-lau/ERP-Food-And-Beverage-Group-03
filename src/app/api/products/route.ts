import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.productVariant.findMany({
      include: {
        stockLevels: {
          include: {
            location: true,
          },
        },
        defaultVendor: true,
      },
      orderBy: { sku: "asc" },
    });

    const enriched = products.map((p) => {
      const whStock = p.stockLevels.find((s) => s.locationCode === "WH-JKT") || { onHand: 0, reserved: 0 };
      const cafeStock = p.stockLevels.find((s) => s.locationCode === "CAFE-JKT") || { onHand: 0, reserved: 0 };

      const totalOnHand = whStock.onHand + cafeStock.onHand;
      const totalReserved = whStock.reserved + cafeStock.reserved;
      const totalAvailable = totalOnHand - totalReserved;
      const totalValuation = totalOnHand * p.standardCost;

      return {
        ...p,
        whStock: {
          locationCode: "WH-JKT",
          onHand: whStock.onHand,
          reserved: whStock.reserved,
          available: whStock.onHand - whStock.reserved,
        },
        cafeStock: {
          locationCode: "CAFE-JKT",
          onHand: cafeStock.onHand,
          reserved: cafeStock.reserved,
          available: cafeStock.onHand - cafeStock.reserved,
        },
        totalOnHand,
        totalReserved,
        totalAvailable,
        totalValuation,
      };
    });

    return NextResponse.json({ success: true, products: enriched });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
