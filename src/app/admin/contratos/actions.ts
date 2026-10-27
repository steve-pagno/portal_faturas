"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { contractSummary } from "@/lib/contract";
import { db } from "@/lib/db";
import { dateInputToDate, parseMoney } from "@/lib/format";
import { str, type FormState } from "@/lib/form";
import { notifyContractInstallments } from "@/lib/notifications";
import { deleteStoredFile, savePdf } from "@/lib/storage";

function pdfFrom(formData: FormData) {
  const f = formData.get("pdf");
  return f instanceof File && f.size > 0 ? f : null;
}

export async function saveContract(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = str(formData, "userId");
  const productId = str(formData, "productId");
  const title = str(formData, "title");
  const description = str(formData, "description") || null;
  const totalCents = parseMoney(str(formData, "total"));
  const startRaw = str(formData, "startDate");
  const startDate = startRaw ? dateInputToDate(startRaw) : null;

  if (!id && !userId) return { error: "Selecione o cliente." };
  if (!productId) return { error: "Selecione o produto." };
  if (!title) return { error: "Informe o título do contrato." };
  if (!totalCents || totalCents <= 0) return { error: "Informe o valor total do contrato." };
  if (startRaw && !startDate) return { error: "Data de início inválida." };

  if (id) {
    const current = await db.contract.findUniqueOrThrow({ where: { id }, include: { invoices: true } });
    const { billed } = contractSummary(current, current.invoices);
    if (totalCents < billed) return { error: `O valor total não pode ser menor que o já lançado em parcelas.` };
  }

  let pdf: { pdfPath: string; pdfName: string; pdfSize: number } | null = null;
  const file = pdfFrom(formData);
  if (file) {
    try {
      pdf = { pdfPath: await savePdf("contracts", file), pdfName: file.name, pdfSize: file.size };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Falha ao salvar o PDF." };
    }
  }

  if (id) {
    const old = await db.contract.findUniqueOrThrow({ where: { id } });
    await db.contract.update({ where: { id }, data: { productId, title, description, totalCents, startDate, ...pdf } });
    if (pdf) await deleteStoredFile(old.pdfPath);
    revalidatePath(`/admin/contratos/${id}`);
    return { success: "Contrato salvo." };
  }

  const client = await db.user.findFirst({ where: { id: userId, role: "CLIENT" } });
  if (!client) return { error: "Cliente não encontrado." };
  const contract = await db.contract.create({ data: { userId, productId, title, description, totalCents, startDate, ...pdf } });
  revalidatePath("/admin/contratos");
  redirect(`/admin/contratos/${contract.id}`);
}

export async function removeContractPdf(id: string) {
  await requireAdmin();
  const c = await db.contract.findUniqueOrThrow({ where: { id } });
  await db.contract.update({ where: { id }, data: { pdfPath: null, pdfName: null, pdfSize: null } });
  await deleteStoredFile(c.pdfPath);
  revalidatePath(`/admin/contratos/${id}`);
}

type Row = { amountCents: number; dueDate: string };

/**
 * Lança parcelas a partir das linhas montadas no formulário (modo fixo ou percentual — o
 * cálculo é feito no cliente; aqui validamos que a soma bate com o saldo a parcelar).
 */
export async function createInstallments(contractId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const contract = await db.contract.findUniqueOrThrow({ where: { id: contractId }, include: { invoices: true } });
  if (contract.status !== "ACTIVE") return { error: "Contrato cancelado." };

  let rows: Row[];
  try {
    rows = JSON.parse(str(formData, "rows"));
  } catch {
    return { error: "Parcelas inválidas." };
  }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 120) return { error: "Informe de 1 a 120 parcelas." };

  const parsed = rows.map((r) => ({ amountCents: Math.round(Number(r.amountCents)), dueDate: dateInputToDate(String(r.dueDate)) }));
  if (parsed.some((r) => !Number.isInteger(r.amountCents) || r.amountCents <= 0)) return { error: "Todas as parcelas precisam ter valor maior que zero." };
  if (parsed.some((r) => !r.dueDate)) return { error: "Todas as parcelas precisam de vencimento." };

  const { unbilled, installments: existing } = contractSummary(contract, contract.invoices);
  const sum = parsed.reduce((s, r) => s + r.amountCents, 0);
  if (sum !== unbilled) return { error: `A soma das parcelas (${(sum / 100).toFixed(2)}) precisa ser igual ao saldo a parcelar (${(unbilled / 100).toFixed(2)}).` };

  parsed.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  const count = existing + parsed.length;

  const created = await db.$transaction(async (tx) => {
    // renumera o total "x/N" das parcelas já existentes
    await tx.invoice.updateMany({ where: { contractId, status: { not: "CANCELED" } }, data: { installmentCount: count } });
    const ids: number[] = [];
    for (const [i, r] of parsed.entries()) {
      const inv = await tx.invoice.create({
        data: {
          userId: contract.userId,
          productId: contract.productId,
          contractId,
          installmentNumber: existing + i + 1,
          installmentCount: count,
          amountCents: r.amountCents,
          dueDate: r.dueDate!,
        },
      });
      ids.push(inv.id);
    }
    return ids;
  });

  if (formData.get("notify") === "on") await notifyContractInstallments(contractId, created);
  revalidatePath(`/admin/contratos/${contractId}`);
  revalidatePath("/admin/faturas");
  return { success: `${created.length} parcela(s) lançada(s).` };
}

/** Cancela o contrato e as parcelas ainda pendentes (as pagas ficam como estão). */
export async function cancelContract(id: string) {
  await requireAdmin();
  const now = new Date();
  await db.$transaction([
    db.contract.update({ where: { id }, data: { status: "CANCELED", canceledAt: now } }),
    db.invoice.updateMany({ where: { contractId: id, status: "PENDING" }, data: { status: "CANCELED", canceledAt: now } }),
  ]);
  revalidatePath(`/admin/contratos/${id}`);
}

export async function reactivateContract(id: string) {
  await requireAdmin();
  await db.contract.update({ where: { id }, data: { status: "ACTIVE", canceledAt: null } });
  revalidatePath(`/admin/contratos/${id}`);
}
