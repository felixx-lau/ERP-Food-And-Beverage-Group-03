import { prisma } from "./prisma";

export async function getNextSequence(type: "SO" | "DO" | "PO" | "RECEIPT" | "INV" | "BILL" | "RET" | "RINV" | "LEAD" | "POS"): Promise<string> {
  switch (type) {
    case "SO": {
      const last = await prisma.salesOrder.findFirst({
        orderBy: { orderNumber: "desc" },
      });
      if (!last || !last.orderNumber.startsWith("S")) {
        return "S00007";
      }
      const num = parseInt(last.orderNumber.replace(/\D/g, ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `S${nextNum.toString().padStart(5, "0")}`;
    }
    case "DO": {
      const last = await prisma.deliveryOrder.findFirst({
        orderBy: { deliveryNumber: "desc" },
      });
      if (!last || !last.deliveryNumber.startsWith("WH/OUT/")) {
        return "WH/OUT/0007";
      }
      const num = parseInt(last.deliveryNumber.replace("WH/OUT/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `WH/OUT/${nextNum.toString().padStart(4, "0")}`;
    }
    case "LEAD": {
      const last = await prisma.crmLead.findFirst({
        orderBy: { id: "desc" },
      });
      if (!last || !last.id.startsWith("LD")) {
        return "LD0004";
      }
      const num = parseInt(last.id.replace(/\D/g, ""), 10);
      const nextNum = isNaN(num) ? 4 : num + 1;
      return `LD${nextNum.toString().padStart(4, "0")}`;
    }
    default:
      return `${type}-${Date.now()}`;
  }
}
