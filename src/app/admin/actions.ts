"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateInputToDate, isValidCpf, onlyDigits, parseMoney } from "@/lib/format";
import { str, type FormState } from "@/lib/form";
import { ensurePaymentLink } from "@/lib/infinitepay";
import {
  notifyInvoiceCanceled,
  notifyInvoiceCreated,
  notifyInvoicePaid,
  runScheduledNotifications,
  sendInvite,
  sendPasswordReset,
} from "@/lib/notifications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uniqueError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String(e.meta?.target ?? "");
    if (target.includes("cpf")) return { error: "Já existe um cliente com este CPF." };
    if (target.includes("email")) return { error: "Já existe um usuário com este e-mail." };
    return { error: "Registro duplicado." };
  }
  throw e;
}

/* ───────────── Clientes ───────────── */

export async function saveClient(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  const cpf = onlyDigits(str(formData, "cpf"));
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone") || null;

  if (name.length < 3) return { error: "Informe o nome completo." };
  if (!isValidCpf(cpf)) return { error: "CPF inválido." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail inválido." };

  let clientId = id;
  try {
    if (id) {
      await db.user.update({ where: { id, role: "CLIENT" }, data: { name, cpf, email, phone } });
    } else {
      const user = await db.user.create({ data: { name, cpf, email, phone, role: "CLIENT" } });
      clientId = user.id;
    }
  } catch (e) {
    return uniqueError(e);
  }

  revalidatePath("/admin/clientes");
  if (id) return { success: "Dados salvos." };

  if (formData.get("sendInvite") === "on") await sendInvite(clientId!);
  redirect(`/admin/clientes/${clientId}`);
}

export async function resendInvite(userId: string) {
  await requireAdmin();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  // quem já tem senha recebe link de redefinição; quem não tem, o convite
  await (user.passwordHash ? sendPasswordReset(userId) : sendInvite(userId));
  revalidatePath(`/admin/clientes/${userId}`);
}

export async function toggleClientActive(userId: string) {
  await requireAdmin();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId, role: "CLIENT" } });
  // ao desativar, incrementa sessionVersion para derrubar sessões abertas
  await db.user.update({
    where: { id: userId },
    data: { active: !user.active, sessionVersion: { increment: user.active ? 1 : 0 } },
  });
  revalidatePath(`/admin/clientes/${userId}`);
  revalidatePath("/admin/clientes");
}

/* ───────────── Produtos ───────────── */

export async function saveProduct(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  const description = str(formData, "description") || null;
  const priceRaw = str(formData, "price");
  const priceCents = priceRaw ? parseMoney(priceRaw) : 0;

  if (!name) return { error: "Informe o nome do produto." };
  if (priceCents === null) return { error: "Valor inválido. Use o formato 1.234,56." };

  if (id) {
    await db.product.update({ where: { id }, data: { name, description, priceCents } });
  } else {
    await db.product.create({ data: { name, description, priceCents } });
  }
  revalidatePath("/admin/produtos");
  if (id) redirect("/admin/produtos");
  return { success: `Produto "${name}" cadastrado.` };
}

export async function toggleProductActive(id: string) {
  await requireAdmin();
  const product = await db.product.findUniqueOrThrow({ where: { id } });
  await db.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath("/admin/produtos");
}

/* ───────────── Faturas ───────────── */

function parseInvoiceFields(formData: FormData) {
  const amountCents = parseMoney(str(formData, "amount"));
  const dueDate = dateInputToDate(str(formData, "dueDate"));
  const description = str(formData, "description") || null;
  if (!amountCents || amountCents <= 0) return { error: "Informe um valor maior que zero." } as const;
  if (!dueDate) return { error: "Informe a data de vencimento." } as const;
  return { amountCents, dueDate, description };
}

export async function createInvoice(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = str(formData, "userId");
  const productId = str(formData, "productId");
  const fields = parseInvoiceFields(formData);
  if ("error" in fields) return fields;
  if (!userId) return { error: "Selecione o cliente." };
  if (!productId) return { error: "Selecione o produto." };

  const client = await db.user.findFirst({ where: { id: userId, role: "CLIENT", active: true } });
  if (!client) return { error: "Cliente não encontrado ou inativo." };

  const invoice = await db.invoice.create({ data: { userId, productId, ...fields } });
  if (formData.get("notify") === "on") await notifyInvoiceCreated(invoice.id);

  revalidatePath("/admin/faturas");
  redirect(`/admin/faturas/${invoice.id}`);
}

export async function updateInvoice(id: number, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id } });
  if (invoice.status !== "PENDING") return { error: "Só faturas pendentes podem ser editadas." };
  const fields = parseInvoiceFields(formData);
  if ("error" in fields) return fields;

  await db.invoice.update({ where: { id }, data: fields });
  if (fields.dueDate.getTime() !== invoice.dueDate.getTime()) {
    // novo vencimento → libera os lembretes para serem enviados de novo no novo calendário
    await db.emailLog.updateMany({ where: { invoiceId: id, dedupeKey: { not: null } }, data: { dedupeKey: null } });
  }
  revalidatePath(`/admin/faturas/${id}`);
  return { success: "Fatura atualizada." };
}

export async function markInvoicePaid(id: number) {
  await requireAdmin();
  const { count } = await db.invoice.updateMany({ where: { id, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
  if (count) await notifyInvoicePaid(id);
  revalidatePath(`/admin/faturas/${id}`);
}

export async function cancelInvoice(id: number) {
  await requireAdmin();
  const { count } = await db.invoice.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELED", canceledAt: new Date() } });
  if (count) await notifyInvoiceCanceled(id);
  revalidatePath(`/admin/faturas/${id}`);
}

export async function reopenInvoice(id: number) {
  await requireAdmin();
  await db.invoice.update({ where: { id }, data: { status: "PENDING", paidAt: null, canceledAt: null } });
  revalidatePath(`/admin/faturas/${id}`);
}

export async function resendInvoiceEmail(id: number) {
  await requireAdmin();
  await notifyInvoiceCreated(id);
  revalidatePath(`/admin/faturas/${id}`);
}

export async function runNotificationsNow(_: FormState): Promise<FormState> {
  await requireAdmin();
  const s = await runScheduledNotifications();
  revalidatePath("/admin/emails");
  return { success: `Verificadas ${s.checked} faturas: ${s.sent} enviados, ${s.failed} falhas, ${s.skipped} já enviados.` };
}

export async function regeneratePaymentLink(id: number, _: FormState): Promise<FormState> {
  await requireAdmin();
  try {
    await ensurePaymentLink(id, { force: true });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao gerar o link." };
  }
  revalidatePath(`/admin/faturas/${id}`);
  return { success: "Novo link de pagamento gerado." };
}

export async function updateAdminProfile(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  if (!name) return { error: "Informe o nome." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail inválido." };
  try {
    await db.user.update({ where: { id: admin.id }, data: { name, email } });
  } catch (e) {
    return uniqueError(e);
  }
  revalidatePath("/admin", "layout");
  return { success: "Dados atualizados." };
}
