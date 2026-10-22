import { NextRequest, NextResponse } from "next/server";
import { getFinancialReconciliation } from "@/lib/dashboardEngine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const simulatedDiffParam = searchParams.get("simulatedDiff");
    const simulatedDiff = simulatedDiffParam ? parseInt(simulatedDiffParam, 10) : 0;

    const reconciliation = await getFinancialReconciliation(Number.isNaN(simulatedDiff) ? 0 : simulatedDiff);
    return NextResponse.json({
      success: true,
      data: reconciliation,
    });
  } catch (error: any) {
    console.error("Dashboard reconciliation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reconciliation data" },
      { status: 500 }
    );
  }
}
