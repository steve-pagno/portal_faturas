import { randomBytes } from "crypto";
import { db } from "./db";
import { invoiceNumber, onlyDigits } from "./format";

/*
 * Checkout Integrado InfinitePay
 * https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-da-infinitepay
 *
 * Fluxo: criamos um link por fatura (order_nsu próprio). Quando o cliente paga, a InfinitePay
 * chama o webhook e/ou redireciona o cliente para /pagamento/retorno com transaction_nsu e slug.
 * Em ambos os casos a confirmação é feita consultando /payment_check — o webhook não é assinado,
 * então nunca damos baixa só com base no que chegou na requisição.
 */

const API = "https://api.checkout.infinitepay.io";

export function infinitePayEnabled() {
  return Boolean(process.env.INFINITEPAY_API_KEY);
}

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "X-Api-Key": process.env.INFINITEPAY_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`InfinitePay ${path} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

/** "https://checkout.infinitepay.io/<handle>/<slug>" → { handle, slug } */
function parseCheckoutUrl(url: string) {
  const [handle, slug] = new URL(url).pathname.split("/").filter(Boolean);
  return { handle, slug };
}

function phoneE164(phone: string | null) {
  const d = onlyDigits(phone ?? "");
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return `+${d}`;
  return undefined;
}

function paymentOptions() {
  const methods = (process.env.INFINITEPAY_METHODS || "pix,credit_card").split(",").map((m) => m.trim());
  const installments = Number(process.env.INFINITEPAY_INSTALLMENTS || 0);
  const pixDiscount = Number(process.env.INFINITEPAY_PIX_DISCOUNT || 0);
  return {
    single_payment: true,
    payment_methods_enabled: methods,
    ...(installments > 0 && { assured_installments: Math.min(12, installments) }),
    ...(pixDiscount > 0 && { discounts: { pix: pixDiscount } }),
  };
}

/** Cria (ou recria, se o valor mudou) o link de pagamento da fatura. Retorna a URL ou null. */
export async function ensurePaymentLink(invoiceId: number, { force = false } = {}) {
  if (!infinitePayEnabled()) return null;
  const inv = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { user: true, product: true, contract: true } });
  if (inv.status !== "PENDING") return null;
  if (!force && inv.paymentUrl && inv.paymentLinkAmount === inv.amountCents) return inv.paymentUrl;

  const orderNsu = `fatura-${inv.id}-${randomBytes(4).toString("hex")}`;
  const webhookUrl = `${appUrl()}/api/webhooks/infinitepay`;
  const installment = inv.installmentNumber ? `Parcela ${inv.installmentNumber}/${inv.installmentCount}` : null;
  const description = [invoiceNumber(inv.id), inv.contract?.title ?? inv.product.name, installment, inv.description].filter(Boolean).join(" · ");

  const { url } = await call<{ url: string }>("/links", {
    order_nsu: orderNsu,
    redirect_url: `${appUrl()}/pagamento/retorno`,
    items: [{ quantity: 1, price: inv.amountCents, description: description.slice(0, 200) }],
    customer: { name: inv.user.name, email: inv.user.email, phone_number: phoneE164(inv.user.phone) },
    options: paymentOptions(),
    // o webhook exige HTTPS; a doc mostra dois formatos, enviamos ambos
    ...(webhookUrl.startsWith("https://") && {
      webhook: { url: webhookUrl, events: ["paid"] },
      webhook_url: webhookUrl,
    }),
  });

  const { slug } = parseCheckoutUrl(url);
  await db.invoice.update({
    where: { id: inv.id },
    data: { paymentUrl: url, paymentOrderNsu: orderNsu, paymentSlug: slug, paymentLinkAmount: inv.amountCents },
  });
  return url;
}

/** Versão que não lança erro: falha da InfinitePay não pode impedir o envio do e-mail. */
export async function tryEnsurePaymentLink(invoiceId: number) {
  try {
    return await ensurePaymentLink(invoiceId);
  } catch (e) {
    console.error(`[infinitepay] falha ao gerar link da fatura ${invoiceId}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

type PaymentCheck = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
};

export type ConfirmInput = {
  orderNsu: string;
  transactionNsu: string;
  slug?: string | null;
  receiptUrl?: string | null;
  captureMethod?: string | null;
};

export type ConfirmResult =
  | { status: "paid" | "already_paid"; invoiceId: number; receiptUrl: string | null }
  | { status: "not_found" | "not_paid" | "mismatch"; invoiceId?: number; detail?: string };

/**
 * Confirma um pagamento consultando a InfinitePay e dá baixa na fatura.
 * Retorna "paid" só na primeira confirmação (quem chama envia o e-mail de pagamento).
 */
export async function confirmPayment(input: ConfirmInput): Promise<ConfirmResult> {
  const inv = await db.invoice.findUnique({ where: { paymentOrderNsu: input.orderNsu } });
  if (!inv) return { status: "not_found" };
  if (inv.status === "PAID") return { status: "already_paid", invoiceId: inv.id, receiptUrl: inv.paymentReceiptUrl };

  const slug = input.slug || inv.paymentSlug;
  const handle = inv.paymentUrl ? parseCheckoutUrl(inv.paymentUrl).handle : process.env.INFINITEPAY_HANDLE;
  const check = await call<PaymentCheck>("/payment_check", {
    handle,
    order_nsu: input.orderNsu,
    transaction_nsu: input.transactionNsu,
    slug,
  });
  console.log(`[infinitepay] payment_check fatura ${inv.id}:`, JSON.stringify(check));

  if (!check.success || !check.paid) return { status: "not_paid", invoiceId: inv.id };
  // "amount" é o valor da cobrança; "paid_amount" pode incluir juros do parcelamento
  const expected = inv.paymentLinkAmount ?? inv.amountCents;
  const pixDiscount = Number(process.env.INFINITEPAY_PIX_DISCOUNT || 0);
  const minAccepted = Math.floor(expected * (1 - pixDiscount / 100));
  if (typeof check.amount !== "number" || check.amount < minAccepted || check.amount > expected) {
    return { status: "mismatch", invoiceId: inv.id, detail: `esperado ${expected}, recebido ${check.amount}` };
  }

  const { count } = await db.invoice.updateMany({
    where: { id: inv.id, status: { not: "PAID" } },
    data: {
      status: "PAID",
      paidAt: new Date(),
      canceledAt: null,
      paymentTransactionNsu: input.transactionNsu,
      paymentMethod: check.capture_method ?? input.captureMethod ?? null,
      paymentReceiptUrl: input.receiptUrl ?? null,
    },
  });
  return { status: count ? "paid" : "already_paid", invoiceId: inv.id, receiptUrl: input.receiptUrl ?? null };
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito" };
