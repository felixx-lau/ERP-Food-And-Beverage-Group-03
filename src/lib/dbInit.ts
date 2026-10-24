import fs from "fs";
import path from "path";
import zlib from "zlib";
import { EMBEDDED_DB_GZIP_BASE64 } from "./embeddedDb";

export function ensureDatabaseExists(): string {
  // If not on Vercel and not in production serverless, keep using standard DATABASE_URL
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return process.env.DATABASE_URL || "file:./erp.db";
  }

  const tmpPath = path.join("/tmp", "erp.db");

  try {
    if (fs.existsSync(tmpPath)) {
      const stat = fs.statSync(tmpPath);
      if (stat.size > 0) {
        return `file:${tmpPath}`;
      }
    }
  } catch {
    // ignore
  }

  // 1. Try to copy from candidates on disk
  const candidates = [
    path.join(process.cwd(), "prisma", "erp.db"),
    path.join(process.cwd(), "erp.db"),
    path.resolve("./prisma/erp.db"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
        fs.copyFileSync(candidate, tmpPath);
        return `file:${tmpPath}`;
      }
    } catch {
      // Continue
    }
  }

  // 2. Restore from embedded gzipped database
  try {
    const compressedBuffer = Buffer.from(EMBEDDED_DB_GZIP_BASE64, "base64");
    const decompressed = zlib.gunzipSync(compressedBuffer);
    fs.writeFileSync(tmpPath, decompressed);
  } catch (err) {
    console.error("Failed to restore embedded SQLite database:", err);
  }

  return `file:${tmpPath}`;
}
