import Link from "next/link";
import { formatCurrency, formatDate, invoiceNumber } from "@/lib/format";
import { displayStatus } from "@/lib/invoice";
import { EmptyState, StatusBadge } from "./ui";

type Row = {
  id: number;
  amountCents: number;
  dueDate: Date;
  status: string;
  product: { name: string };
  user?: { id: string; name: string };
  installmentNumber?: number | null;
  installmentCount?: number | null;
};

export function InvoiceTable({ invoices, basePath, showClient = true }: { invoices: Row[]; basePath: string; showClient?: boolean }) {
  if (!invoices.length) return <EmptyState>Nenhuma fatura encontrada.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Nº</th>
            {showClient && <th>Cliente</th>}
            <th>Produto</th>
            <th className="text-right">Valor</th>
            <th>Vencimento</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-zinc-50">
              <td>
                <Link href={`${basePath}/${inv.id}`} className="link">
                  {invoiceNumber(inv.id)}
                </Link>
              </td>
              {showClient && <td>{inv.user?.name}</td>}
              <td>
                {inv.product.name}
                {inv.installmentNumber && (
                  <span className="block text-xs text-zinc-500">
                    Parcela {inv.installmentNumber}/{inv.installmentCount}
                  </span>
                )}
              </td>
              <td className="text-right tabular-nums">{formatCurrency(inv.amountCents)}</td>
              <td className="tabular-nums">{formatDate(inv.dueDate)}</td>
              <td>
                <StatusBadge status={displayStatus(inv)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
