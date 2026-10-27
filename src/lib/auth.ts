import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; role: string; sessionVersion: number }) {
  const token = await signSession({
    sub: user.id,
    role: user.role === "ADMIN" ? "ADMIN" : "CLIENT",
    ver: user.sessionVersion,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // cookie Secure só quando servido via HTTPS (senão o navegador o descarta e o login entra em loop)
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Usuário logado (valida no banco: ativo e versão de sessão atual). */
export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active || user.sessionVersion !== session.ver) return null;
  return user;
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/portal");
  return user;
}

export async function requireClient() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  return user;
}
