import { db } from "./db";
import { daysUntil, today } from "./format";
import { sendMail, type MailMessage } from "./mail";
import { templates } from "./mail/templates";
import { createAuthToken } from "./tokens";
import { tryEnsurePaymentLink } from "./infinitepay";

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  INVITE: "Convite de acesso",
  PASSWORD_RESET: "Redefinição de senha",
  INVOICE_CREATED: "Nova fatura",
  INVOICE_REMINDER: "Lembrete de vencimento",
  INVOICE_DUE_TODAY: "Vence hoje",
  INVOICE_OVERDUE: "Fatura vencida",
  INVOICE_PAID: "Pagamento confirmado",
  INVOICE_CANCELED: "Fatura cancelada",
  CONTRACT_INSTALLMENTS: "Parcelas do contrato",
};

type DeliverOpts = { type: string; message: MailMessage; userId?: string; invoiceId?: number; dedupeKey?: string };

/**
 * Envia e registra no EmailLog. Com dedupeKey, não reenvia o que já foi enviado com sucesso;
 * falhas não gravam a chave, então são tentadas de novo na próxima rodada.
 */
async function deliver({ type, message, userId, invoiceId, dedupeKey }: DeliverOpts) {
  if (dedupeKey && (await db.emailLog.findUnique({ where: { dedupeKey } }))) return "skipped" as const;
  const base = { type, to: message.to, subject: message.subject, userId, invoiceId };
  try {
    await sendMail(message);
    await db.emailLog.create({ data: { ...base, status: "SENT", dedupeKey } }).catch(() => {
      // corrida com outra execução simultânea: o e-mail já saiu, só não duplicamos o registro
    });
    return "sent" as const;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[mail] falha ao enviar ${type} para ${message.to}:`, error);
    await db.emailLog.create({ data: { ...base, status: "FAILED", error } });
    return "failed" as const;
  }
}

const loadInvoice = (id: number) =>
  db.invoice.findUniqueOrThrow({ where: { id }, include: { user: true, product: true, contract: true } });

export async function sendInvite(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await createAuthToken(user.id, "INVITE");
  return deliver({ type: "INVITE", userId, message: templates.invite(user, token) });
}

export async function sendPasswordReset(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await createAuthToken(user.id, "RESET");
  return deliver({ type: "PASSWORD_RESET", userId, message: templates.passwordReset(user, token) });
}

export async function notifyInvoiceCreated(invoiceId: number) {
  const payUrl = await tryEnsurePaymentLink(invoiceId);
  const inv = await loadInvoice(invoiceId);
  return deliver({ type: "INVOICE_CREATED", userId: inv.userId, invoiceId, message: templates.invoiceCreated(inv, payUrl) });
}

export async function notifyInvoicePaid(invoiceId: number) {
  const inv = await loadInvoice(invoiceId);
  return deliver({ type: "INVOICE_PAID", userId: inv.userId, invoiceId, message: templates.invoicePaid(inv) });
}

export async function notifyInvoiceCanceled(invoiceId: number) {
  const inv = await loadInvoice(invoiceId);
  return deliver({ type: "INVOICE_CANCELED", userId: inv.userId, invoiceId, message: templates.invoiceCanceled(inv) });
}

/** Um único e-mail com o cronograma das parcelas recém-lançadas (em vez de um por parcela). */
export async function notifyContractInstallments(contractId: string, invoiceIds: number[]) {
  const contract = await db.contract.findUniqueOrThrow({ where: { id: contractId }, include: { user: true } });
  const installments = await db.invoice.findMany({ where: { id: { in: invoiceIds } }, orderBy: { dueDate: "asc" } });
  if (!installments.length) return "skipped" as const;
  const first = installments[0];
  const payUrl = await tryEnsurePaymentLink(first.id);
  return deliver({
    type: "CONTRACT_INSTALLMENTS",
    userId: contract.userId,
    invoiceId: first.id,
    message: templates.contractInstallments(contract, installments, { id: first.id, payUrl }),
  });
}

function reminderDays() {
  return (process.env.REMINDER_DAYS || "5,1")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

/**
 * Rodada de notificações agendadas. É idempotente (usa dedupeKey), então pode rodar
 * várias vezes por dia sem duplicar e-mails; se uma execução for perdida, a próxima recupera.
 */
export async function runScheduledNotifications() {
  const days = reminderDays();
  // OVERDUE_REPEAT_DAYS="0" desliga os avisos de atraso
  const overdueRepeat = Number(process.env.OVERDUE_REPEAT_DAYS ?? 7);
  const startOfToday = today();
  const summary = { checked: 0, sent: 0, skipped: 0, failed: 0 };

  const invoices = await db.invoice.findMany({
    where: { status: "PENDING", user: { active: true } },
    include: { user: true, product: true, contract: true },
  });

  for (const inv of invoices) {
    summary.checked++;
    const d = daysUntil(inv.dueDate);
    let job: Omit<DeliverOpts, "userId" | "invoiceId"> | null = null;

    // gera o link só quando realmente há algo a enviar (abaixo), via payUrl()
    const payUrl = () => tryEnsurePaymentLink(inv.id);

    if (d > 0) {
      // menor janela de lembrete que já foi alcançada (ex.: dias "5,1" e faltam 3 → janela 5)
      const window = days.find((w) => d <= w);
      // não manda lembrete para fatura criada hoje: o e-mail de "nova fatura" já cumpre esse papel
      if (window !== undefined && inv.createdAt < startOfToday) {
        job = { type: "INVOICE_REMINDER", dedupeKey: `${inv.id}:REMINDER:${window}`, message: templates.invoiceReminder(inv, d, await payUrl()) };
      }
    } else if (d === 0) {
      job = { type: "INVOICE_DUE_TODAY", dedupeKey: `${inv.id}:DUE_TODAY`, message: templates.invoiceDueToday(inv, await payUrl()) };
    } else if (overdueRepeat > 0) {
      const late = -d;
      const cycle = Math.floor((late - 1) / overdueRepeat); // dia 1 → ciclo 0, dia 1+N → ciclo 1...
      job = { type: "INVOICE_OVERDUE", dedupeKey: `${inv.id}:OVERDUE:${cycle}`, message: templates.invoiceOverdue(inv, late, await payUrl()) };
    }

    if (!job) continue;
    const result = await deliver({ ...job, userId: inv.userId, invoiceId: inv.id });
    summary[result]++;
  }

  return summary;
}
