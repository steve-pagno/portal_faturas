// Funções de sessão sem dependências de Node/Prisma: usadas também no middleware (edge).
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "CLIENT";
export type SessionPayload = { sub: string; role: Role; ver: number };

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET ausente ou curto (mínimo 32 caracteres)");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "ADMIN" && payload.role !== "CLIENT")) return null;
    return { sub: payload.sub, role: payload.role, ver: Number(payload.ver ?? 0) };
  } catch {
    return null;
  }
}
