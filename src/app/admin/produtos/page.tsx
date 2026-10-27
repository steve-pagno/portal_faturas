import Link from "next/link";
import { SubmitButton } from "@/components/forms";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toggleProductActive } from "../actions";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await db.product.findMany({
    include: { _count: { select: { invoices: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader title="Produtos" subtitle="Produtos e serviços que você fatura" />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          {products.length === 0 ? (
            <EmptyState>Nenhum produto cadastrado.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Valor sugerido</th>
                    <th className="text-right">Faturas</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                      <td>
                        <Link href={`/admin/produtos/${p.id}`} className="link">
                          {p.name}
                        </Link>
                        {p.description && <p className="text-xs text-zinc-500">{p.description}</p>}
                      </td>
                      <td className="text-right tabular-nums">{formatCurrency(p.priceCents)}</td>
                      <td className="text-right">{p._count.invoices}</td>
                      <td>{p.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                      <td className="text-right">
                        <form action={toggleProductActive.bind(null, p.id)}>
                          <SubmitButton className="btn btn-secondary px-2 py-1 text-xs">{p.active ? "Desativar" : "Ativar"}</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="mb-4 font-semibold">Novo produto</h2>
          <ProductForm />
        </section>
      </div>
    </>
  );
}
