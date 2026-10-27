import type { ContractStatus } from "@/lib/contract";
import { Badge } from "./ui";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const tone = status === "QUITADO" ? "green" : status === "CANCELADO" ? "red" : "amber";
  return <Badge tone={tone}>{status}</Badge>;
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
