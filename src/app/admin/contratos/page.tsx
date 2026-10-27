import Link from "next/link";
import { ContractStatusBadge, ProgressBar } from "@/components/contract-ui";
import { EmptyState, PageHeader } from "@/components/ui";
import { contractSummary } from "@/lib/contract";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const contracts = await db.contract.findMany({
    where: term ? { OR: [{ title: { contains: term } }, { user: { name: { contains: term } } }] } : {},
    include: { user: true, invoices: { select: { status: true, amountCents: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Contratos"
        subtitle={`${contracts.length} contrato(s)`}
        action={
          <Link href="/admin/contratos/novo" className="btn btn-primary">
            + Novo contrato
          </Link>
        }
      />
      <div className="card">
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por título ou cliente" className="input max-w-sm" />
          <button className="btn btn-secondary">Buscar</button>
        </form>
        {contracts.length === 0 ? (
          <EmptyState>Nenhum contrato cadastrado.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Cliente</th>
                  <th className="text-right">Total</th>
                  <th className="w-48">Recebido</th>
                  <th>Parcelas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const s = contractSummary(c, c.invoices);
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td>
                        <Link href={`/admin/contratos/${c.id}`} className="link">
                          {c.title}
                        </Link>
                        {c.pdfPath && <span className="ml-2 text-xs text-zinc-500">PDF</span>}
                      </td>
                      <td>{c.user.name}</td>
                      <td className="text-right tabular-nums">{formatCurrency(c.totalCents)}</td>
                      <td>
                        <ProgressBar value={s.paid} total={c.totalCents} />
                        <span className="text-xs text-zinc-500">{formatCurrency(s.paid)}</span>
                      </td>
                      <td className="text-sm">
                        {s.paidInstallments}/{s.installments} pagas
                        {s.unbilled > 0 && <span className="block text-xs text-amber-700">{formatCurrency(s.unbilled)} a parcelar</span>}
                      </td>
                      <td>
                        <ContractStatusBadge status={s.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
