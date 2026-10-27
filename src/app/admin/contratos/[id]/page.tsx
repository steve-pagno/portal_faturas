import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractStatusBadge, ProgressBar } from "@/components/contract-ui";
import { SubmitButton } from "@/components/forms";
import { InvoiceTable } from "@/components/invoice-table";
import { PageHeader, StatCard } from "@/components/ui";
import { contractSummary } from "@/lib/contract";
import { db } from "@/lib/db";
import { addDays, formatBytes, formatCpf, formatCurrency, formatDate, toDateInput, today } from "@/lib/format";
import { cancelContract, createInstallments, reactivateContract, removeContractPdf } from "../actions";
import { ContractForm } from "../contract-form";
import { InstallmentsForm } from "../installments-form";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      user: true,
      product: true,
      invoices: { include: { product: true }, orderBy: [{ installmentNumber: "asc" }, { dueDate: "asc" }] },
    },
  });
  if (!contract) notFound();

  const [clients, products] = await Promise.all([
    db.user.findMany({ where: { id: contract.userId } }),
    db.product.findMany({ where: { OR: [{ active: true }, { id: contract.productId }] }, orderBy: { name: "asc" } }),
  ]);

  const s = contractSummary(contract, contract.invoices);
  const active = contract.status === "ACTIVE";
  const lastDue = contract.invoices.filter((i) => i.status !== "CANCELED").at(-1)?.dueDate;
  const firstDue = toDateInput(lastDue ? addDays(lastDue, 30) : addDays(today(), 7));

  return (
    <>
      <PageHeader
        title={contract.title}
        subtitle={`${contract.product.name}${contract.startDate ? ` · início em ${formatDate(contract.startDate)}` : ""}`}
        action={<ContractStatusBadge status={s.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Valor do contrato" value={formatCurrency(contract.totalCents)} />
        <StatCard label="Recebido" value={formatCurrency(s.paid)} hint={`${s.paidInstallments}/${s.installments} parcelas pagas`} tone="green" />
        <StatCard label="Em aberto" value={formatCurrency(s.open)} />
        <StatCard label="A parcelar" value={formatCurrency(s.unbilled)} hint={s.unbilled ? "ainda não lançado" : "tudo lançado"} />
      </div>
      <div className="mt-3">
        <ProgressBar value={s.paid} total={contract.totalCents} />
      </div>

      {active && s.unbilled > 0 && (
        <section className="card mt-6">
          <h2 className="mb-1 font-semibold">Lançar parcelas</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Cada parcela vira uma fatura com link de pagamento, lembrete 3 dias antes e no dia do vencimento.
          </p>
          <InstallmentsForm key={s.unbilled} action={createInstallments.bind(null, contract.id)} remainingCents={s.unbilled} defaultFirstDue={firstDue} />
        </section>
      )}

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold">Parcelas</h2>
        <InvoiceTable invoices={contract.invoices} basePath="/admin/faturas" showClient={false} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Dados do contrato</h2>
          <ContractForm contract={contract} clients={clients} products={products} />
        </section>

        <div className="space-y-6">
          <section className="card space-y-2">
            <h2 className="font-semibold">Cliente</h2>
            <Link href={`/admin/clientes/${contract.userId}`} className="link">
              {contract.user.name}
            </Link>
            <p className="text-sm text-zinc-500">
              {formatCpf(contract.user.cpf)} · {contract.user.email}
            </p>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">PDF do contrato</h2>
            {contract.pdfPath ? (
              <>
                <p className="break-all text-sm">
                  {contract.pdfName} <span className="text-zinc-500">({formatBytes(contract.pdfSize ?? 0)})</span>
                </p>
                <div className="flex gap-2">
                  <a href={`/api/contratos/${contract.id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-secondary flex-1">
                    Abrir
                  </a>
                  <form action={removeContractPdf.bind(null, contract.id)}>
                    <SubmitButton className="btn btn-secondary text-red-600" confirm="Remover o PDF deste contrato?">
                      Remover
                    </SubmitButton>
                  </form>
                </div>
                <p className="text-xs text-zinc-500">O cliente também consegue ver e baixar este PDF no portal.</p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Nenhum PDF anexado. Envie pelo formulário “Dados do contrato”.</p>
            )}
          </section>

          <section className="card">
            {active ? (
              <form action={cancelContract.bind(null, contract.id)}>
                <SubmitButton className="btn btn-danger w-full" confirm="Cancelar o contrato? As parcelas pendentes serão canceladas (as pagas são mantidas).">
                  Cancelar contrato
                </SubmitButton>
              </form>
            ) : (
              <form action={reactivateContract.bind(null, contract.id)}>
                <SubmitButton className="btn btn-secondary w-full">Reativar contrato</SubmitButton>
                <p className="mt-2 text-xs text-zinc-500">Parcelas canceladas não voltam; o saldo poderá ser parcelado de novo.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
