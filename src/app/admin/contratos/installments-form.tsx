"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert, Field, SubmitButton } from "@/components/forms";
import type { FormState } from "@/lib/form";

type Mode = "fixed" | "percent";
type Row = { amount: string; percent: string; dueDate: string };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (cents: number) => brl.format(cents / 100);
const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

function parseMoney(s: string) {
  let v = s.trim().replace(/[R$\s]/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return v && Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

function parsePercent(s: string) {
  const n = Number(s.trim().replace(",", "."));
  return s.trim() && Number.isFinite(n) ? n : NaN;
}

/** "2026-01-31" + 1 mês → "2026-02-28" */
function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

/** Divide `total` em partes proporcionais aos pesos, ajustando os centavos na última. */
function split(total: number, weights: number[]) {
  const sumW = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => Math.floor((total * w) / sumW));
  parts[parts.length - 1] += total - parts.reduce((s, p) => s + p, 0);
  return parts;
}

export function InstallmentsForm({
  action,
  remainingCents,
  defaultFirstDue,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  remainingCents: number;
  defaultFirstDue: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [mode, setMode] = useState<Mode>("fixed");
  const [count, setCount] = useState(3);
  const [firstDue, setFirstDue] = useState(defaultFirstDue);
  const [interval, setEvery] = useState(1);
  const [rows, setRows] = useState<Row[]>(() => build("fixed", 3, defaultFirstDue, 1));

  function build(m: Mode, n: number, first: string, every: number): Row[] {
    const safeN = Math.max(1, Math.min(120, n || 1));
    const amounts = split(remainingCents, Array(safeN).fill(1));
    // percentuais "redondos": 3 parcelas → 33,33 / 33,33 / 33,34
    const pcts = split(10000, Array(safeN).fill(1)).map((p) => (p / 100).toFixed(2).replace(".", ","));
    return amounts.map((a, i) => ({
      amount: toInput(a),
      percent: pcts[i],
      dueDate: addMonths(first || defaultFirstDue, i * Math.max(1, every)),
    }));
  }

  function regenerate(next: Partial<{ mode: Mode; count: number; firstDue: string; interval: number }>) {
    const m = next.mode ?? mode;
    const n = next.count ?? count;
    const f = next.firstDue ?? firstDue;
    const e = next.interval ?? interval;
    setMode(m);
    setCount(n);
    setFirstDue(f);
    setEvery(e);
    setRows(build(m, n, f, e));
  }

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // valores finais em centavos (no modo percentual, derivados dos percentuais)
  const computed = useMemo(() => {
    if (mode === "fixed") return rows.map((r) => parseMoney(r.amount));
    const pcts = rows.map((r) => parsePercent(r.percent));
    if (pcts.some((p) => Number.isNaN(p) || p <= 0)) return pcts.map(() => NaN);
    const pctSum = pcts.reduce((s, p) => s + p, 0);
    if (Math.abs(pctSum - 100) > 0.001) return pcts.map((p) => Math.round((remainingCents * p) / 100));
    return split(remainingCents, pcts); // soma exata quando os percentuais fecham 100%
  }, [mode, rows, remainingCents]);

  const total = computed.reduce((s, c) => s + (Number.isNaN(c) ? 0 : c), 0);
  const pctTotal = rows.reduce((s, r) => s + (parsePercent(r.percent) || 0), 0);
  const invalid = computed.some((c) => Number.isNaN(c) || c <= 0) || rows.some((r) => !r.dueDate);
  const diff = remainingCents - total;
  const ok = !invalid && diff === 0;

  const payload = JSON.stringify(rows.map((r, i) => ({ amountCents: computed[i], dueDate: r.dueDate })));

  return (
    <form action={formAction} className="space-y-4">
      <div className="inline-flex rounded-lg border border-zinc-300 p-1 text-sm">
        {(
          [
            ["fixed", "Valor fixo"],
            ["percent", "Percentual"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => regenerate({ mode: m })}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === m ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nº de parcelas">
          <input type="number" min={1} max={120} className="input" value={count} onChange={(e) => regenerate({ count: Number(e.target.value) })} />
        </Field>
        <Field label="1º vencimento">
          <input type="date" className="input" value={firstDue} onChange={(e) => regenerate({ firstDue: e.target.value })} />
        </Field>
        <Field label="Intervalo">
          <select className="input" value={interval} onChange={(e) => regenerate({ interval: Number(e.target.value) })}>
            <option value={1}>Mensal</option>
            <option value={2}>Bimestral</option>
            <option value={3}>Trimestral</option>
            <option value={6}>Semestral</option>
            <option value={12}>Anual</option>
          </select>
        </Field>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              {mode === "percent" && <th>%</th>}
              <th>Valor (R$)</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="text-zinc-500">{i + 1}</td>
                {mode === "percent" && (
                  <td>
                    <input className="input w-24" inputMode="decimal" value={r.percent} onChange={(e) => update(i, { percent: e.target.value })} />
                  </td>
                )}
                <td>
                  {mode === "fixed" ? (
                    <input className="input w-36" inputMode="decimal" value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} />
                  ) : (
                    <span className="tabular-nums">{Number.isNaN(computed[i]) ? "—" : fmt(computed[i])}</span>
                  )}
                </td>
                <td>
                  <input type="date" className="input w-44" value={r.dueDate} onChange={(e) => update(i, { dueDate: e.target.value })} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td>Total</td>
              {mode === "percent" && <td className={Math.abs(pctTotal - 100) > 0.001 ? "text-red-600" : ""}>{pctTotal.toFixed(2).replace(".", ",")}%</td>}
              <td className={ok ? "text-emerald-700" : "text-red-600"}>{fmt(total)}</td>
              <td className="text-xs font-normal text-zinc-500">
                Saldo a parcelar: {fmt(remainingCents)}
                {!invalid && diff !== 0 && <span className="ml-1 text-red-600">({diff > 0 ? "faltam" : "sobram"} {fmt(Math.abs(diff))})</span>}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <input type="hidden" name="rows" value={payload} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4" />
        Enviar ao cliente um e-mail com o cronograma das parcelas
      </label>
      <Alert state={state} />
      <SubmitButton className={`btn btn-primary ${ok ? "" : "pointer-events-none opacity-50"}`}>
        Lançar {rows.length} parcela{rows.length > 1 ? "s" : ""}
      </SubmitButton>
    </form>
  );
}
