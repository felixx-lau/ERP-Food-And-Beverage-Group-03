import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sku } = await params;
    const product = await prisma.productVariant.findUnique({
      where: { sku },
      include: {
        stockLevels: {
          include: { location: true },
        },
        defaultVendor: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const wh = product.stockLevels.find((s) => s.locationCode === "WH-JKT") || { onHand: 0, reserved: 0 };
    const cafe = product.stockLevels.find((s) => s.locationCode === "CAFE-JKT") || { onHand: 0, reserved: 0 };

    const whAvailable = wh.onHand - wh.reserved;
    const cafeAvailable = cafe.onHand - cafe.reserved;
    const companyOnHand = wh.onHand + cafe.onHand;
    const companyReserved = wh.reserved + cafe.reserved;
    const companyAvailable = companyOnHand - companyReserved;

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        locations: [
          {
            locationCode: "WH-JKT",
            locationName: "Gudang Pusat Jakarta",
            onHand: wh.onHand,
            reserved: wh.reserved,
            available: whAvailable,
            valuation: wh.onHand * product.standardCost,
          },
          {
            locationCode: "CAFE-JKT",
            locationName: "Gerai Jakarta",
            onHand: cafe.onHand,
            reserved: cafe.reserved,
            available: cafeAvailable,
            valuation: cafe.onHand * product.standardCost,
          },
        ],
        companyOnHand,
        companyReserved,
        companyAvailable,
        totalValuation: companyOnHand * product.standardCost,
      },
    });
  } catch (error) {
    console.error("Fetch product detail error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PATCH endpoint to update stock (used for SR-17 & T-06 stock adjustment)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only WAREHOUSE or OWNER can adjust stock
    if (user.role !== Role.WAREHOUSE && user.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Warehouse atau Owner yang dapat mengubah level stok." },
        { status: 403 }
      );
    }

    const { sku } = await params;
    const body = await request.json();
    const { locationCode, newOnHand } = body;

    if (!locationCode || newOnHand === undefined || typeof newOnHand !== "number" || newOnHand < 0) {
      return NextResponse.json(
        { error: "locationCode dan newOnHand (>= 0) wajib disertakan." },
        { status: 400 }
      );
    }

    const existingStock = await prisma.stockLevel.findUnique({
      where: {
        productSku_locationCode: {
          productSku: sku,
          locationCode,
        },
      },
    });

    if (!existingStock) {
      return NextResponse.json({ error: "Stock record not found" }, { status: 404 });
    }

    // SR-04: Cannot reduce below reserved
    if (newOnHand < existingStock.reserved) {
      return NextResponse.json(
        {
          error: `Stok fisik (${newOnHand}) tidak boleh lebih kecil dari kuantitas yang telah di-reserve (${existingStock.reserved}).`,
        },
        { status: 400 }
      );
    }

    const beforeState = { onHand: existingStock.onHand, reserved: existingStock.reserved };
    const updated = await prisma.stockLevel.update({
      where: {
        productSku_locationCode: {
          productSku: sku,
          locationCode,
        },
      },
      data: {
        onHand: newOnHand,
      },
    });
    const afterState = { onHand: updated.onHand, reserved: updated.reserved };

    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STOCK_ADJUSTMENT",
      documentType: "STOCK_LEVEL",
      documentId: `${sku}@${locationCode}`,
      beforeState,
      afterState,
      notes: `Stok ${sku} di ${locationCode} diubah dari ${beforeState.onHand} ke ${newOnHand}`,
    });

    return NextResponse.json({
      success: true,
      message: `Stok ${sku} di ${locationCode} berhasil diperbarui.`,
      stock: updated,
    });
  } catch (error) {
    console.error("Update stock error:", error);
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}
