import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { InvoiceTable } from "@/components/invoice-table";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatCurrency, today } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = {
  todas: "Todas",
  pendentes: "Pendentes",
  vencidas: "Vencidas",
  pagas: "Pagas",
  canceladas: "Canceladas",
} as const;
type Filter = keyof typeof FILTERS;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status: Filter = sp.status && sp.status in FILTERS ? (sp.status as Filter) : "todas";
  const q = sp.q?.trim() ?? "";
  const t = today();

  const statusWhere: Record<Filter, Prisma.InvoiceWhereInput> = {
    todas: {},
    pendentes: { status: "PENDING", dueDate: { gte: t } },
    vencidas: { status: "PENDING", dueDate: { lt: t } },
    pagas: { status: "PAID" },
    canceladas: { status: "CANCELED" },
  };

  const where: Prisma.InvoiceWhereInput = {
    ...statusWhere[status],
    ...(q && { user: { name: { contains: q } } }),
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({ where, include: { user: true, product: true }, orderBy: { dueDate: "desc" }, take: 200 }),
    db.invoice.aggregate({ where, _sum: { amountCents: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Faturas"
        subtitle={`${invoices.length} fatura(s) · ${formatCurrency(total._sum.amountCents ?? 0)}`}
        action={
          <Link href="/admin/faturas/nova" className="btn btn-primary">
            + Nova fatura
          </Link>
        }
      />
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={{ query: { ...(f !== "todas" && { status: f }), ...(q && { q }) } }}
              className={`rounded-full px-3 py-1 text-sm ${f === status ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
            >
              {FILTERS[f]}
            </Link>
          ))}
          <form className="ml-auto flex gap-2">
            {status !== "todas" && <input type="hidden" name="status" value={status} />}
            <input name="q" defaultValue={q} placeholder="Buscar cliente" className="input w-48" />
            <button className="btn btn-secondary">Buscar</button>
          </form>
        </div>
        <InvoiceTable invoices={invoices} basePath="/admin/faturas" />
      </div>
    </>
  );
}
