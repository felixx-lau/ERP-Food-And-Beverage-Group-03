import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "rasa-aruna-kitchen-secure-jwt-token-key-2026"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(request?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = request.cookies.get("rasa_aruna_session")?.value;
    }
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("rasa_aruna_session")?.value;
  }

  if (!token) return null;
  return await verifySessionToken(token);
}

export const MODULE_PERMISSIONS: Record<string, Role[]> = {
  sales: [Role.OWNER, Role.SALES],
  crm: [Role.OWNER, Role.SALES],
  purchase: [Role.OWNER, Role.PROCUREMENT],
  inventory: [Role.OWNER, Role.WAREHOUSE, Role.PROCUREMENT],
  accounting: [Role.OWNER, Role.FINANCE],
  invoicing: [Role.OWNER, Role.FINANCE, Role.SALES],
  pos: [Role.OWNER, Role.CASHIER],
  dashboard: [Role.OWNER, Role.FINANCE, Role.SALES, Role.WAREHOUSE, Role.PROCUREMENT],
};

export function canAccessModule(role: Role, module: string): boolean {
  const allowed = MODULE_PERMISSIONS[module.toLowerCase()];
  if (!allowed) return false;
  return allowed.includes(role);
}
