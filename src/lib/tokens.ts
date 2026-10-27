import { createHash, randomBytes } from "crypto";
import { db } from "./db";

export type TokenType = "INVITE" | "RESET";

const TTL: Record<TokenType, number> = {
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 dias
  RESET: 60 * 60 * 1000, // 1 hora
};

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Cria um token de uso único e invalida os anteriores do mesmo tipo. Retorna o token em claro. */
export async function createAuthToken(userId: string, type: TokenType) {
  const raw = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
    db.authToken.create({
      data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + TTL[type]) },
    }),
  ]);
  return raw;
}

export async function findValidToken(raw: string) {
  const token = await db.authToken.findUnique({ where: { tokenHash: hash(raw) }, include: { user: true } });
  if (!token || token.usedAt || token.expiresAt < new Date() || !token.user.active) return null;
  return token;
}

export async function consumeToken(id: string) {
  await db.authToken.update({ where: { id }, data: { usedAt: new Date() } });
}
