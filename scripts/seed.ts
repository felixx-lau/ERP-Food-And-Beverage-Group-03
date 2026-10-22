import { PrismaClient } from "@prisma/client";
import { executeSeed } from "../src/lib/seedData";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Executing Baseline Seed for Rasa Aruna Kitchen ERP...");
  const result = await executeSeed(prisma, "CLI Seed Runner");
  console.log("✅ Seed complete:", JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
