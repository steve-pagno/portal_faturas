import Link from "next/link";
import { invoiceNumber } from "@/lib/format";
import { confirmAndNotify, readPaymentParams } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento" };

// Página pública para onde a InfinitePay redireciona após o pagamento.
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const input = readPaymentParams((k) => sp[k]);

  let result: Awaited<ReturnType<typeof confirmAndNotify>> | null = null;
  if (input) {
    try {
      result = await confirmAndNotify(input);
    } catch (e) {
      console.error("[infinitepay] erro ao confirmar no retorno:", e);
    }
  }

  const confirmed = result && (result.status === "paid" || result.status === "already_paid") ? result : null;
  const paid = Boolean(confirmed);
  const receiptUrl = confirmed?.receiptUrl;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${paid ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
          {paid ? "✓" : "…"}
        </div>
        <h1 className="text-xl font-semibold">{paid ? "Pagamento confirmado!" : "Estamos processando seu pagamento"}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {paid
            ? `A fatura ${invoiceNumber(confirmed!.invoiceId)} foi quitada. Você também receberá a confirmação por e-mail.`
            : "Assim que a confirmação chegar, a fatura será atualizada e você receberá um e-mail."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {receiptUrl && (
            <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              Ver comprovante
            </a>
          )}
          <Link href={result?.invoiceId ? `/portal/faturas/${result.invoiceId}` : "/portal"} className="btn btn-primary">
            Ir para a área do cliente
          </Link>
        </div>
      </div>
    </main>
  );
}
