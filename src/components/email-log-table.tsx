import { formatDateTime, invoiceNumber } from "@/lib/format";
import { EMAIL_TYPE_LABELS } from "@/lib/notifications";
import { Badge, EmptyState } from "./ui";

type Log = { id: string; type: string; to: string; subject: string; status: string; error: string | null; createdAt: Date; invoiceId: number | null };

export function EmailLogTable({ logs, showInvoice = true }: { logs: Log[]; showInvoice?: boolean }) {
  if (!logs.length) return <EmptyState>Nenhum e-mail enviado ainda.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Para</th>
            {showInvoice && <th>Fatura</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap tabular-nums">{formatDateTime(l.createdAt)}</td>
              <td>
                {EMAIL_TYPE_LABELS[l.type] ?? l.type}
                <p className="text-xs text-zinc-500">{l.subject}</p>
              </td>
              <td>{l.to}</td>
              {showInvoice && <td>{l.invoiceId ? invoiceNumber(l.invoiceId) : "—"}</td>}
              <td>
                {l.status === "SENT" ? <Badge tone="green">Enviado</Badge> : <Badge tone="red">Falhou</Badge>}
                {l.error && <p className="mt-1 max-w-xs text-xs text-red-600">{l.error}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
