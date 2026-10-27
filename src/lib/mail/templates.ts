import { formatCurrency, formatDate, invoiceNumber } from "../format";
import type { MailMessage } from "./types";

type InvoiceData = {
  id: number;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  contract?: { title: string } | null;
  amountCents: number;
  dueDate: Date;
  description: string | null;
  product: { name: string };
  user: { name: string; email: string };
};

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }, secondary?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:28px 0 ${secondary ? "8px" : "28px"}"><a href="${esc(cta.url)}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>` +
      (secondary ? `<p style="margin:0 0 28px;font-size:13px"><a href="${esc(secondary.url)}" style="color:#4f46e5">${esc(secondary.label)}</a></p>` : "")
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
${button}
<p style="font-size:12px;color:#71717a;margin-top:32px">Este é um e-mail automático. Em caso de dúvidas, responda a esta mensagem.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function invoiceTable(inv: InvoiceData) {
  const rows: [string, string][] = [
    ["Fatura", invoiceNumber(inv.id)],
    ["Produto", inv.product.name],
    ...(inv.contract ? [["Contrato", inv.contract.title] as [string, string]] : []),
    ...(inv.installmentNumber ? [["Parcela", `${inv.installmentNumber} de ${inv.installmentCount}`] as [string, string]] : []),
    ...(inv.description ? [["Descrição", inv.description] as [string, string]] : []),
    ["Valor", formatCurrency(inv.amountCents)],
    ["Vencimento", formatDate(inv.dueDate)],
  ];
  const html = `<table cellpadding="6" style="border-collapse:collapse;font-size:14px;width:100%">${rows
    .map(([k, v]) => `<tr><td style="color:#71717a;width:120px">${k}</td><td><strong>${esc(v)}</strong></td></tr>`)
    .join("")}</table>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { html, text };
}

type Link = { label: string; url: string };

function build(to: string, subject: string, title: string, paragraphs: string[], inv?: InvoiceData, cta?: Link, secondary?: Link): MailMessage {
  const table = inv ? invoiceTable(inv) : null;
  const html = layout(
    title,
    paragraphs.map((p) => `<p style="font-size:15px;line-height:1.5">${esc(p)}</p>`).join("") + (table?.html ?? ""),
    cta,
    secondary,
  );
  const links = [cta, secondary].filter((l): l is Link => Boolean(l));
  const text = [title, "", ...paragraphs, ...(table ? ["", table.text] : []), ...links.flatMap((l) => ["", `${l.label}: ${l.url}`])].join("\n");
  return { to, subject, html, text };
}

const firstName = (name: string) => name.split(" ")[0];
const portalLink = (inv: InvoiceData) => ({ label: "Ver fatura", url: `${appUrl()}/portal/faturas/${inv.id}` });

/** Com link de pagamento: botão "Pagar agora" + link secundário para o portal. */
function payLinks(inv: InvoiceData, payUrl?: string | null): [Link, Link?] {
  return payUrl ? [{ label: "Pagar agora (Pix ou cartão)", url: payUrl }, { label: "Ver fatura na área do cliente", url: portalLink(inv).url }] : [portalLink(inv)];
}

export const templates = {
  invite(user: { name: string; email: string }, token: string) {
    return build(
      user.email,
      "Seu acesso à área do cliente",
      `Olá, ${firstName(user.name)}!`,
      ["Seu cadastro foi criado. Defina sua senha para acessar a área do cliente, onde você acompanha suas faturas.", "O link é válido por 7 dias."],
      undefined,
      { label: "Definir minha senha", url: `${appUrl()}/definir-senha/${token}` },
    );
  },

  passwordReset(user: { name: string; email: string }, token: string) {
    return build(
      user.email,
      "Redefinição de senha",
      `Olá, ${firstName(user.name)}!`,
      ["Recebemos um pedido para redefinir sua senha. O link abaixo é válido por 1 hora.", "Se não foi você, ignore este e-mail."],
      undefined,
      { label: "Redefinir senha", url: `${appUrl()}/definir-senha/${token}` },
    );
  },

  invoiceCreated(inv: InvoiceData, payUrl?: string | null) {
    return build(
      inv.user.email,
      `Nova fatura ${invoiceNumber(inv.id)} — vence em ${formatDate(inv.dueDate)}`,
      `Olá, ${firstName(inv.user.name)}!`,
      ["Uma nova fatura foi emitida para você:"],
      inv,
      ...payLinks(inv, payUrl),
    );
  },

  invoiceReminder(inv: InvoiceData, days: number, payUrl?: string | null) {
    const when = days === 1 ? "amanhã" : `em ${days} dias`;
    return build(
      inv.user.email,
      `Lembrete: sua fatura ${invoiceNumber(inv.id)} vence ${when}`,
      `Olá, ${firstName(inv.user.name)}!`,
      [`Este é um lembrete de que sua fatura vence ${when}.`],
      inv,
      ...payLinks(inv, payUrl),
    );
  },

  invoiceDueToday(inv: InvoiceData, payUrl?: string | null) {
    return build(
      inv.user.email,
      `Sua fatura ${invoiceNumber(inv.id)} vence hoje`,
      `Olá, ${firstName(inv.user.name)}!`,
      ["Sua fatura vence hoje. Se já efetuou o pagamento, desconsidere este aviso."],
      inv,
      ...payLinks(inv, payUrl),
    );
  },

  invoiceOverdue(inv: InvoiceData, daysLate: number, payUrl?: string | null) {
    return build(
      inv.user.email,
      `Fatura ${invoiceNumber(inv.id)} em atraso`,
      `Olá, ${firstName(inv.user.name)}!`,
      [`Identificamos que sua fatura está em aberto há ${daysLate} dia${daysLate > 1 ? "s" : ""} após o vencimento.`, "Se já efetuou o pagamento, desconsidere este aviso."],
      inv,
      ...payLinks(inv, payUrl),
    );
  },

  invoicePaid(inv: InvoiceData) {
    return build(
      inv.user.email,
      `Pagamento confirmado — fatura ${invoiceNumber(inv.id)}`,
      `Olá, ${firstName(inv.user.name)}!`,
      ["Confirmamos o pagamento da sua fatura. Obrigado!"],
      inv,
      portalLink(inv),
    );
  },

  contractInstallments(
    contract: { title: string; totalCents: number; user: { name: string; email: string } },
    installments: { id: number; amountCents: number; dueDate: Date; installmentNumber: number | null; installmentCount: number | null }[],
    first: { id: number; payUrl: string | null },
  ) {
    const rows = installments.map((i) => [
      `${i.installmentNumber}/${i.installmentCount}`,
      formatDate(i.dueDate),
      formatCurrency(i.amountCents),
    ]);
    const table = `<table cellpadding="6" style="border-collapse:collapse;font-size:14px;width:100%;margin-top:8px">
<tr style="color:#71717a;text-align:left"><th>Parcela</th><th>Vencimento</th><th style="text-align:right">Valor</th></tr>
${rows.map((r) => `<tr style="border-top:1px solid #f4f4f5"><td>${r[0]}</td><td>${r[1]}</td><td style="text-align:right"><strong>${r[2]}</strong></td></tr>`).join("")}
</table>`;
    const intro = [
      `As parcelas do contrato "${contract.title}" foram lançadas. Confira o cronograma abaixo.`,
      "Você receberá um lembrete 3 dias antes de cada vencimento e no dia, com o link para pagamento.",
    ];
    const portalUrl = `${appUrl()}/portal/faturas/${first.id}`;
    const cta = first.payUrl ? { label: "Pagar a 1ª parcela agora", url: first.payUrl } : { label: "Ver na área do cliente", url: portalUrl };
    const secondary = first.payUrl ? { label: "Ver na área do cliente", url: portalUrl } : undefined;
    const title = `Olá, ${firstName(contract.user.name)}!`;
    return {
      to: contract.user.email,
      subject: `Parcelas do contrato "${contract.title}"`,
      html: layout(title, intro.map((p) => `<p style="font-size:15px;line-height:1.5">${esc(p)}</p>`).join("") + table, cta, secondary),
      text: [title, "", ...intro, "", ...rows.map((r) => `${r[0]} — ${r[1]} — ${r[2]}`), "", `${cta.label}: ${cta.url}`, ...(secondary ? [`${secondary.label}: ${secondary.url}`] : [])].join("\n"),
    };
  },

  invoiceCanceled(inv: InvoiceData) {
    return build(
      inv.user.email,
      `Fatura ${invoiceNumber(inv.id)} cancelada`,
      `Olá, ${firstName(inv.user.name)}!`,
      ["A fatura abaixo foi cancelada e não precisa mais ser paga."],
      inv,
    );
  },
};
