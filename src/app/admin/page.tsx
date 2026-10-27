import Link from "next/link";
import { InvoiceTable } from "@/components/invoice-table";
import { PageHeader, StatCard } from "@/components/ui";
import { db } from "@/lib/db";
import { addDays, formatCurrency, today } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const t = today();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clients, open, overdue, paidMonth, upcoming, overdueList] = await Promise.all([
    db.user.count({ where: { role: "CLIENT", active: true } }),
    db.invoice.aggregate({ where: { status: "PENDING", dueDate: { gte: t } }, _sum: { amountCents: true }, _count: true }),
    db.invoice.aggregate({ where: { status: "PENDING", dueDate: { lt: t } }, _sum: { amountCents: true }, _count: true }),
    db.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountCents: true }, _count: true }),
    db.invoice.findMany({
      where: { status: "PENDING", dueDate: { gte: t, lte: addDays(t, 7) } },
      include: { user: true, product: true },
      orderBy: { dueDate: "asc" },
    }),
    db.invoice.findMany({
      where: { status: "PENDING", dueDate: { lt: t } },
      include: { user: true, product: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Painel"
        action={
          <Link href="/admin/faturas/nova" className="btn btn-primary">
            + Nova fatura
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={String(clients)} />
        <StatCard label="A receber" value={formatCurrency(open._sum.amountCents ?? 0)} hint={`${open._count} fatura(s) em dia`} />
        <StatCard label="Vencido" value={formatCurrency(overdue._sum.amountCents ?? 0)} hint={`${overdue._count} fatura(s)`} tone="red" />
        <StatCard label="Recebido no mês" value={formatCurrency(paidMonth._sum.amountCents ?? 0)} hint={`${paidMonth._count} fatura(s)`} tone="green" />
      </div>

      <section className="card mt-8">
        <h2 className="mb-4 font-semibold">Vencendo nos próximos 7 dias</h2>
        <InvoiceTable invoices={upcoming} basePath="/admin/faturas" />
      </section>

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold text-red-700">Vencidas</h2>
        <InvoiceTable invoices={overdueList} basePath="/admin/faturas" />
      </section>
    </>
  );
}
