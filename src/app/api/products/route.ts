import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await request.json();
    const {
      sku,
      name,
      size = "Regular",
      color = "Original",
      unit = "porsi",
      salesPrice,
      standardCost,
      defaultVendorId,
      initialWhStock = 0,
      initialCafeStock = 0,
    } = body;

    if (!sku || !name || salesPrice === undefined || standardCost === undefined) {
      return NextResponse.json(
        { error: "SKU, Nama Produk, Harga Jual, dan Biaya Standar (HPP) wajib diisi." },
        { status: 400 }
      );
    }

    const cleanSku = sku.trim().toUpperCase();
    const existing = await prisma.productVariant.findUnique({
      where: { sku: cleanSku },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Produk dengan SKU ${cleanSku} sudah terdaftar.` },
        { status: 400 }
      );
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.productVariant.create({
        data: {
          sku: cleanSku,
          name: name.trim(),
          size: size.trim(),
          color: color.trim(),
          unit: unit.trim().toLowerCase(),
          salesPrice: Number(salesPrice),
          standardCost: Number(standardCost),
          defaultVendorId: defaultVendorId || null,
        },
      });

      // Initialize stock levels for WH-JKT and CAFE-JKT
      await tx.stockLevel.create({
        data: {
          productSku: cleanSku,
          locationCode: "WH-JKT",
          onHand: Math.max(0, parseInt(initialWhStock) || 0),
          reserved: 0,
        },
      });

      await tx.stockLevel.create({
        data: {
          productSku: cleanSku,
          locationCode: "CAFE-JKT",
          onHand: Math.max(0, parseInt(initialCafeStock) || 0),
          reserved: 0,
        },
      });

      return prod;
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE_PRODUCT",
      documentType: "PRODUCT",
      documentId: cleanSku,
      notes: `Produk baru ditambahkan: ${name} (${cleanSku}) - WH: ${initialWhStock}, CAFE: ${initialCafeStock}`,
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: error.message || "Gagal membuat produk baru." }, { status: 500 });
  }
}
