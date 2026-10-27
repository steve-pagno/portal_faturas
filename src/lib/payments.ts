import { confirmPayment, type ConfirmInput } from "./infinitepay";
import { notifyInvoicePaid } from "./notifications";

/** Confirma na InfinitePay e, na primeira confirmação, envia o e-mail de pagamento recebido. */
export async function confirmAndNotify(input: ConfirmInput) {
  const result = await confirmPayment(input);
  if (result.status === "paid") await notifyInvoicePaid(result.invoiceId);
  if (result.status === "mismatch") console.warn(`[infinitepay] valor divergente na fatura ${result.invoiceId}: ${result.detail}`);
  return result;
}

/** Extrai os campos de pagamento do corpo do webhook ou da query do redirect (nomes variam). */
export function readPaymentParams(get: (key: string) => unknown): ConfirmInput | null {
  const s = (k: string) => {
    const v = get(k);
    return typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null;
  };
  const orderNsu = s("order_nsu");
  const transactionNsu = s("transaction_nsu");
  if (!orderNsu || !transactionNsu) return null;
  return {
    orderNsu,
    transactionNsu,
    slug: s("slug") ?? s("invoice_slug"),
    receiptUrl: s("receipt_url"),
    captureMethod: s("capture_method"),
  };
}
