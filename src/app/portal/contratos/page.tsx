import Link from "next/link";
import { ContractStatusBadge, ProgressBar } from "@/components/contract-ui";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { contractSummary } from "@/lib/contract";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalContractsPage() {
  const user = await requireClient();
  const contracts = await db.contract.findMany({
    where: { userId: user.id },
    include: { invoices: { select: { status: true, amountCents: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Meus contratos" />
      {contracts.length === 0 ? (
        <div className="card">
          <EmptyState>Você ainda não tem contratos.</EmptyState>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contracts.map((c) => {
            const s = contractSummary(c, c.invoices);
            return (
              <Link key={c.id} href={`/portal/contratos/${c.id}`} className="card block transition hover:border-indigo-300">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{c.title}</h2>
                  <ContractStatusBadge status={s.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatCurrency(s.paid)} pagos de {formatCurrency(c.totalCents)} · {s.paidInstallments}/{s.installments} parcelas
                </p>
                <div className="mt-3">
                  <ProgressBar value={s.paid} total={c.totalCents} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
