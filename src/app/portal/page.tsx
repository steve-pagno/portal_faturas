import { InvoiceTable } from "@/components/invoice-table";
import { PageHeader, StatCard } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { displayStatus } from "@/lib/invoice";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const user = await requireClient();
  const invoices = await db.invoice.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { dueDate: "desc" },
  });

  const open = invoices.filter((i) => i.status === "PENDING");
  const overdue = open.filter((i) => displayStatus(i) === "VENCIDA");
  const next = open.filter((i) => displayStatus(i) === "PENDENTE").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  const sum = (list: typeof invoices) => formatCurrency(list.reduce((s, i) => s + i.amountCents, 0));

  return (
    <>
      <PageHeader title={`Olá, ${user.name.split(" ")[0]}!`} subtitle="Acompanhe aqui suas faturas." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Em aberto" value={sum(open)} hint={`${open.length} fatura(s)`} />
        <StatCard label="Próximo vencimento" value={next ? formatDate(next.dueDate) : "—"} hint={next ? formatCurrency(next.amountCents) : undefined} />
        <StatCard label="Vencidas" value={sum(overdue)} hint={`${overdue.length} fatura(s)`} tone={overdue.length ? "red" : undefined} />
      </div>
      <section className="card mt-8">
        <h2 className="mb-4 font-semibold">Faturas</h2>
        <InvoiceTable invoices={invoices} basePath="/portal/faturas" showClient={false} />
      </section>
    </>
  );
}
