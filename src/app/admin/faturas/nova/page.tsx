import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { addDays, centsToInput, formatCpf, formatCurrency, toDateInput, today } from "@/lib/format";
import { createInvoice } from "../../actions";
import { NewInvoiceForm } from "../invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId } = await searchParams;
  const [clients, products] = await Promise.all([
    db.user.findMany({ where: { role: "CLIENT", active: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Nova fatura" />
      <div className="card max-w-2xl">
        {clients.length === 0 || products.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Para lançar uma fatura, cadastre antes ao menos{" "}
            {clients.length === 0 && (
              <Link href="/admin/clientes/novo" className="link">
                um cliente
              </Link>
            )}
            {clients.length === 0 && products.length === 0 && " e "}
            {products.length === 0 && (
              <Link href="/admin/produtos" className="link">
                um produto
              </Link>
            )}
            .
          </p>
        ) : (
          <NewInvoiceForm
            action={createInvoice}
            defaultClientId={clientId}
            defaultDueDate={toDateInput(addDays(today(), 7))}
            clients={clients.map((c) => ({ id: c.id, label: `${c.name} — ${formatCpf(c.cpf)}` }))}
            products={products.map((p) => ({
              id: p.id,
              label: p.priceCents ? `${p.name} (${formatCurrency(p.priceCents)})` : p.name,
              price: centsToInput(p.priceCents),
            }))}
          />
        )}
      </div>
    </>
  );
}
