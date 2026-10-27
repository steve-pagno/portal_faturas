import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatDateTime, invoiceNumber } from "@/lib/format";
import { infinitePayEnabled, PAYMENT_METHOD_LABELS } from "@/lib/infinitepay";
import { displayStatus } from "@/lib/invoice";
import { payInvoice } from "../../actions";

export const dynamic = "force-dynamic";

export default async function PortalInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireClient();
  const id = Number((await params).id);
  const { erro } = await searchParams;
  if (!Number.isInteger(id)) notFound();
  // filtra pelo dono: um cliente nunca vê fatura de outro
  const invoice = await db.invoice.findFirst({ where: { id, userId: user.id }, include: { product: true, contract: true } });
  if (!invoice) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Produto", invoice.product.name],
    ...(invoice.contract
      ? [
          [
            "Contrato",
            <Link key="c" href={`/portal/contratos/${invoice.contract.id}`} className="link">
              {invoice.contract.title}
            </Link>,
          ] as [string, React.ReactNode],
        ]
      : []),
    ...(invoice.installmentNumber ? [["Parcela", `${invoice.installmentNumber} de ${invoice.installmentCount}`] as [string, string]] : []),
    ...(invoice.description ? [["Descrição", invoice.description] as [string, string]] : []),
    ["Valor", <strong key="v" className="text-xl">{formatCurrency(invoice.amountCents)}</strong>],
    ["Vencimento", formatDate(invoice.dueDate)],
    ["Emitida em", formatDateTime(invoice.createdAt)],
    ...(invoice.paidAt ? [["Pago em", formatDateTime(invoice.paidAt)] as [string, string]] : []),
    ...(invoice.paymentMethod ? [["Forma de pagamento", PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod] as [string, string]] : []),
  ];
  const canPay = invoice.status === "PENDING" && infinitePayEnabled();

  return (
    <>
      <PageHeader title={`Fatura ${invoiceNumber(invoice.id)}`} action={<StatusBadge status={displayStatus(invoice)} />} />
      <section className="card max-w-xl">
        <dl className="divide-y divide-zinc-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-zinc-500">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {canPay && (
          <form action={payInvoice.bind(null, invoice.id)} className="mt-6">
            <SubmitButton className="btn btn-primary w-full py-3 text-base">Pagar agora · Pix ou cartão</SubmitButton>
            <p className="mt-2 text-center text-xs text-zinc-500">Você será levado ao ambiente seguro da InfinitePay.</p>
          </form>
        )}
        {erro === "pagamento" && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Não foi possível abrir o pagamento agora. Tente novamente em instantes.</p>
        )}
        {invoice.paymentReceiptUrl && (
          <a href={invoice.paymentReceiptUrl} target="_blank" rel="noreferrer" className="btn btn-secondary mt-6 w-full">
            Ver comprovante
          </a>
        )}
      </section>
      <p className="mt-6">
        <Link href="/portal" className="link">
          ← Voltar
        </Link>
      </p>
    </>
  );
}
