"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensurePaymentLink } from "@/lib/infinitepay";
import { createSession, getCurrentUser, hashPassword, requireClient, verifyPassword } from "@/lib/auth";
import { MIN_PASSWORD, str, type FormState } from "@/lib/form";

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const current = str(formData, "current");
  const password = str(formData, "password");
  const confirm = str(formData, "confirm");

  if (!user.passwordHash || !(await verifyPassword(current, user.passwordHash))) return { error: "Senha atual incorreta." };
  if (password.length < MIN_PASSWORD) return { error: `A nova senha deve ter pelo menos ${MIN_PASSWORD} caracteres.` };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
  });
  await createSession(updated); // encerra outras sessões e mantém esta
  return { success: "Senha alterada com sucesso." };
}

/** Garante um link de pagamento atualizado e leva o cliente ao checkout da InfinitePay. */
export async function payInvoice(invoiceId: number) {
  const user = await requireClient();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id, status: "PENDING" } });
  if (!invoice) redirect("/portal");

  let url: string | null = null;
  try {
    url = await ensurePaymentLink(invoice.id);
  } catch (e) {
    console.error(`[infinitepay] falha ao gerar link da fatura ${invoice.id}:`, e);
  }
  redirect(url ?? `/portal/faturas/${invoice.id}?erro=pagamento`);
}
