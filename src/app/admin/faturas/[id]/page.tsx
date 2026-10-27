import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmailLogTable } from "@/components/email-log-table";
import { PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { daysUntil, formatCpf, formatCurrency, formatDate, formatDateTime, invoiceNumber } from "@/lib/format";
import { infinitePayEnabled, PAYMENT_METHOD_LABELS } from "@/lib/infinitepay";
import { displayStatus } from "@/lib/invoice";
import { cancelInvoice, markInvoicePaid, regeneratePaymentLink, reopenInvoice, resendInvoiceEmail } from "../../actions";
import { EditInvoiceForm } from "../edit-invoice-form";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { user: true, product: true, contract: true, emails: { orderBy: { createdAt: "desc" } } },
  });
  if (!invoice) notFound();

  const status = displayStatus(invoice);
  const d = daysUntil(invoice.dueDate);
  const pending = invoice.status === "PENDING";

  return (
    <>
      <PageHeader title={`Fatura ${invoiceNumber(invoice.id)}`} subtitle={`Lançada em ${formatDateTime(invoice.createdAt)}`} action={<StatusBadge status={status} />} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-zinc-500">Cliente</dt>
              <dd>
                <Link href={`/admin/clientes/${invoice.userId}`} className="link">
                  {invoice.user.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {formatCpf(invoice.user.cpf)} · {invoice.user.email}
                </p>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Produto</dt>
              <dd>{invoice.product.name}</dd>
            </div>
            {invoice.contract && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-zinc-500">Contrato</dt>
                <dd>
                  <Link href={`/admin/contratos/${invoice.contract.id}`} className="link">
                    {invoice.contract.title}
                  </Link>
                  {invoice.installmentNumber && (
                    <span className="ml-2 text-sm text-zinc-500">
                      parcela {invoice.installmentNumber}/{invoice.installmentCount}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-zinc-500">Valor</dt>
              <dd className="text-xl font-semibold">{formatCurrency(invoice.amountCents)}</dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Vencimento</dt>
              <dd>
                {formatDate(invoice.dueDate)}
                {pending && (
                  <span className={`ml-2 text-xs ${d < 0 ? "text-red-600" : "text-zinc-500"}`}>
                    {d === 0 ? "(hoje)" : d > 0 ? `(em ${d} dia${d > 1 ? "s" : ""})` : `(${-d} dia${d < -1 ? "s" : ""} em atraso)`}
                  </span>
                )}
              </dd>
            </div>
            {invoice.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-zinc-500">Descrição</dt>
                <dd>{invoice.description}</dd>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <dt className="text-sm text-zinc-500">Pago em</dt>
                <dd>{formatDateTime(invoice.paidAt)}</dd>
              </div>
            )}
            {invoice.paymentMethod && (
              <div>
                <dt className="text-sm text-zinc-500">Forma de pagamento</dt>
                <dd>
                  {PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}
                  {invoice.paymentReceiptUrl && (
                    <a href={invoice.paymentReceiptUrl} target="_blank" rel="noreferrer" className="link ml-2 text-sm">
                      comprovante
                    </a>
                  )}
                </dd>
              </div>
            )}
            {invoice.canceledAt && (
              <div>
                <dt className="text-sm text-zinc-500">Cancelada em</dt>
                <dd>{formatDateTime(invoice.canceledAt)}</dd>
              </div>
            )}
          </dl>

          {pending && (
            <div className="mt-6 border-t border-zinc-100 pt-6">
              <h2 className="mb-4 font-semibold">Editar</h2>
              <EditInvoiceForm invoice={invoice} />
            </div>
          )}
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Ações</h2>
          {pending ? (
            <>
              <form action={markInvoicePaid.bind(null, invoice.id)}>
                <SubmitButton className="btn btn-success w-full" confirm="Confirmar o recebimento? O cliente será avisado por e-mail.">
                  Marcar como paga
                </SubmitButton>
              </form>
              <form action={resendInvoiceEmail.bind(null, invoice.id)}>
                <SubmitButton className="btn btn-secondary w-full">Reenviar e-mail da fatura</SubmitButton>
              </form>
              <form action={cancelInvoice.bind(null, invoice.id)}>
                <SubmitButton className="btn btn-danger w-full" confirm="Cancelar esta fatura? O cliente será avisado por e-mail.">
                  Cancelar fatura
                </SubmitButton>
              </form>
            </>
          ) : (
            <form action={reopenInvoice.bind(null, invoice.id)}>
              <SubmitButton className="btn btn-secondary w-full" confirm="Voltar a fatura para pendente?">
                Reabrir fatura
              </SubmitButton>
            </form>
          )}
        </section>
      </div>

      {pending && infinitePayEnabled() && (
        <section className="card mt-6">
          <h2 className="mb-2 font-semibold">Link de pagamento (InfinitePay)</h2>
          {invoice.paymentUrl ? (
            <p className="break-all text-sm">
              <a href={invoice.paymentUrl} target="_blank" rel="noreferrer" className="link">
                {invoice.paymentUrl}
              </a>
              {invoice.paymentLinkAmount !== invoice.amountCents && (
                <span className="ml-2 text-xs text-amber-700">(valor da fatura mudou — um novo link será gerado no próximo envio)</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Ainda não gerado. Ele é criado automaticamente no envio do e-mail ou quando o cliente clica em “Pagar agora”.</p>
          )}
          <ActionForm action={regeneratePaymentLink.bind(null, invoice.id)} submitLabel={invoice.paymentUrl ? "Gerar novo link" : "Gerar link agora"} className="mt-4 space-y-3" submitClassName="btn btn-secondary">
            {null}
          </ActionForm>
        </section>
      )}

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold">E-mails desta fatura</h2>
        <EmailLogTable logs={invoice.emails} showInvoice={false} />
      </section>
    </>
  );
}
