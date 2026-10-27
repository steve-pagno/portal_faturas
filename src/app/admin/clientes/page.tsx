import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatCpf, onlyDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const digits = onlyDigits(term);

  const clients = await db.user.findMany({
    where: {
      role: "CLIENT",
      ...(term && {
        OR: [
          { name: { contains: term } },
          { email: { contains: term.toLowerCase() } },
          ...(digits ? [{ cpf: { contains: digits } }] : []),
        ],
      }),
    },
    include: { _count: { select: { invoices: { where: { status: "PENDING" } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} cliente(s)`}
        action={
          <Link href="/admin/clientes/novo" className="btn btn-primary">
            + Novo cliente
          </Link>
        }
      />
      <div className="card">
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por nome, CPF ou e-mail" className="input max-w-sm" />
          <button className="btn btn-secondary">Buscar</button>
        </form>
        {clients.length === 0 ? (
          <EmptyState>Nenhum cliente encontrado.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>E-mail</th>
                  <th>Acesso</th>
                  <th className="text-right">Faturas em aberto</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td>
                      <Link href={`/admin/clientes/${c.id}`} className="link">
                        {c.name}
                      </Link>
                    </td>
                    <td className="tabular-nums">{formatCpf(c.cpf)}</td>
                    <td>{c.email}</td>
                    <td>
                      {!c.active ? <Badge tone="red">Inativo</Badge> : c.passwordHash ? <Badge tone="green">Ativo</Badge> : <Badge tone="amber">Convite pendente</Badge>}
                    </td>
                    <td className="text-right">{c._count.invoices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
