import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/forms";
import { InvoiceTable } from "@/components/invoice-table";
import { Badge, PageHeader } from "@/components/ui";
import { ContractStatusBadge } from "@/components/contract-ui";
import { contractSummary } from "@/lib/contract";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { resendInvite, toggleClientActive } from "../../actions";
import { ClientForm } from "../client-form";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await db.user.findFirst({
    where: { id, role: "CLIENT" },
    include: {
      invoices: { include: { product: true }, orderBy: { dueDate: "desc" } },
      contracts: { include: { invoices: { select: { status: true, amountCents: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  return (
    <>
      <PageHeader
        title={client.name}
        subtitle={client.email}
        action={
          <div className="flex gap-2">
            <Link href={`/admin/contratos/novo?clientId=${client.id}`} className="btn btn-secondary">
              + Novo contrato
            </Link>
            <Link href={`/admin/faturas/nova?clientId=${client.id}`} className="btn btn-primary">
              + Nova fatura avulsa
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Dados do cliente</h2>
          <ClientForm client={client} />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Acesso</h2>
          <p className="text-sm">
            Status:{" "}
            {!client.active ? <Badge tone="red">Inativo</Badge> : client.passwordHash ? <Badge tone="green">Senha definida</Badge> : <Badge tone="amber">Convite pendente</Badge>}
          </p>
          <form action={resendInvite.bind(null, client.id)}>
            <SubmitButton className="btn btn-secondary w-full">{client.passwordHash ? "Enviar link de nova senha" : "Reenviar convite"}</SubmitButton>
          </form>
          <form action={toggleClientActive.bind(null, client.id)}>
            <SubmitButton
              className={`btn w-full ${client.active ? "btn-danger" : "btn-success"}`}
              confirm={client.active ? "Desativar o cliente? Ele perde o acesso e deixa de receber avisos." : undefined}
            >
              {client.active ? "Desativar cliente" : "Reativar cliente"}
            </SubmitButton>
          </form>
        </section>
      </div>

      {client.contracts.length > 0 && (
        <section className="card mt-6">
          <h2 className="mb-4 font-semibold">Contratos</h2>
          <ul className="divide-y divide-zinc-100">
            {client.contracts.map((c) => {
              const s = contractSummary(c, c.invoices);
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <Link href={`/admin/contratos/${c.id}`} className="link">
                    {c.title}
                  </Link>
                  <span className="text-sm text-zinc-500">
                    {formatCurrency(s.paid)} de {formatCurrency(c.totalCents)} · {s.paidInstallments}/{s.installments} parcelas
                  </span>
                  <ContractStatusBadge status={s.status} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold">Faturas</h2>
        <InvoiceTable invoices={client.invoices} basePath="/admin/faturas" showClient={false} />
      </section>
    </>
  );
}
