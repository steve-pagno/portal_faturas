import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { ContractForm } from "../contract-form";

export const dynamic = "force-dynamic";

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId } = await searchParams;
  const [clients, products] = await Promise.all([
    db.user.findMany({ where: { role: "CLIENT", active: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Novo contrato" subtitle="Depois de criar, você lança as parcelas na página do contrato." />
      <div className="card max-w-3xl">
        {clients.length === 0 || products.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Cadastre antes ao menos um{" "}
            <Link href="/admin/clientes/novo" className="link">
              cliente
            </Link>{" "}
            e um{" "}
            <Link href="/admin/produtos" className="link">
              produto
            </Link>
            .
          </p>
        ) : (
          <ContractForm clients={clients} products={products} defaultClientId={clientId} />
        )}
      </div>
    </>
  );
}
