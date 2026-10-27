"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { onlyDigits } from "@/lib/format";
import { MIN_PASSWORD, str, type FormState } from "@/lib/form";
import { sendPasswordReset } from "@/lib/notifications";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { consumeToken, findValidToken } from "@/lib/tokens";

const TOO_MANY = { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };


export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const identifier = str(formData, "identifier");
  const password = str(formData, "password");
  if (!identifier || !password) return { error: "Informe e-mail/CPF e senha." };

  const ip = await clientIp();
  const key = `login:${ip}:${identifier.toLowerCase()}`;
  if (!rateLimit(key, 10, 15 * 60_000) || !rateLimit(`login-ip:${ip}`, 50, 15 * 60_000)) return TOO_MANY;

  const cpf = onlyDigits(identifier);
  const user = identifier.includes("@")
    ? await db.user.findUnique({ where: { email: identifier.toLowerCase() } })
    : cpf.length === 11
      ? await db.user.findUnique({ where: { cpf } })
      : null;

  const ok = user?.passwordHash && user.active && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) return { error: "Credenciais inválidas." };

  resetRateLimit(key);
  await createSession(user);
  redirect(user.role === "ADMIN" ? "/admin" : "/portal");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const identifier = str(formData, "identifier");
  if (!rateLimit(`reset:${await clientIp()}`, 5, 15 * 60_000)) return TOO_MANY;
  const cpf = onlyDigits(identifier);
  const user = identifier.includes("@")
    ? await db.user.findUnique({ where: { email: identifier.toLowerCase() } })
    : cpf.length === 11
      ? await db.user.findUnique({ where: { cpf } })
      : null;

  if (user?.active) await sendPasswordReset(user.id);
  // resposta sempre igual, para não revelar quais contas existem
  return { success: "Se houver uma conta com esses dados, enviamos um link de redefinição para o e-mail cadastrado." };
}

export async function setPasswordWithToken(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const password = str(formData, "password");
  const confirm = str(formData, "confirm");
  if (password.length < MIN_PASSWORD) return { error: `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.` };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const record = await findValidToken(token);
  if (!record) return { error: "Link inválido ou expirado. Solicite um novo." };

  const user = await db.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
  });
  await consumeToken(record.id);
  await createSession(user);
  redirect(user.role === "ADMIN" ? "/admin" : "/portal");
}
