import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractStatusBadge, ProgressBar } from "@/components/contract-ui";
import { InvoiceTable } from "@/components/invoice-table";
import { PageHeader, StatCard } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { contractSummary } from "@/lib/contract";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalContractPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireClient();
  const { id } = await params;
  const contract = await db.contract.findFirst({
    where: { id, userId: user.id },
    include: {
      product: true,
      invoices: { where: { status: { not: "CANCELED" } }, include: { product: true }, orderBy: [{ installmentNumber: "asc" }, { dueDate: "asc" }] },
    },
  });
  if (!contract) notFound();
  const s = contractSummary(contract, contract.invoices);

  return (
    <>
      <PageHeader
        title={contract.title}
        subtitle={`${contract.product.name}${contract.startDate ? ` · início em ${formatDate(contract.startDate)}` : ""}`}
        action={<ContractStatusBadge status={s.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Valor do contrato" value={formatCurrency(contract.totalCents)} />
        <StatCard label="Pago" value={formatCurrency(s.paid)} hint={`${s.paidInstallments}/${s.installments} parcelas`} tone="green" />
        <StatCard label="Em aberto" value={formatCurrency(s.open)} />
      </div>
      <div className="mt-3">
        <ProgressBar value={s.paid} total={contract.totalCents} />
      </div>

      {(contract.pdfPath || contract.description) && (
        <section className="card mt-6 space-y-3">
          {contract.description && <p className="whitespace-pre-line text-sm text-zinc-700">{contract.description}</p>}
          {contract.pdfPath && (
            <div className="flex flex-wrap gap-2">
              <a href={`/api/contratos/${contract.id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-primary">
                Ver contrato (PDF)
              </a>
              <a href={`/api/contratos/${contract.id}/pdf?download`} className="btn btn-secondary">
                Baixar
              </a>
            </div>
          )}
        </section>
      )}

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold">Parcelas</h2>
        <InvoiceTable invoices={contract.invoices} basePath="/portal/faturas" showClient={false} />
      </section>
      <p className="mt-6">
        <Link href="/portal/contratos" className="link">
          ← Voltar
        </Link>
      </p>
    </>
  );
}
