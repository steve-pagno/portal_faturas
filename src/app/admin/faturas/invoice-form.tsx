"use client";

import { useActionState, useState } from "react";
import { Alert, Field, SubmitButton } from "@/components/forms";
import type { FormState } from "@/lib/form";

type Option = { id: string; label: string };
type ProductOption = Option & { price: string };

export function NewInvoiceForm({
  action,
  clients,
  products,
  defaultClientId,
  defaultDueDate,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  clients: Option[];
  products: ProductOption[];
  defaultClientId?: string;
  defaultDueDate: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [amount, setAmount] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Cliente">
        <select name="userId" className="input" defaultValue={defaultClientId ?? ""} required>
          <option value="" disabled>
            Selecione...
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Produto">
        <select
          name="productId"
          className="input"
          defaultValue=""
          required
          onChange={(e) => {
            const p = products.find((p) => p.id === e.target.value);
            if (p && p.price !== "0,00") setAmount(p.price);
          }}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor a faturar (R$)">
          <input name="amount" className="input" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Vencimento">
          <input name="dueDate" type="date" className="input" defaultValue={defaultDueDate} required />
        </Field>
      </div>
      <Field label="Descrição (opcional)" hint="Aparece no e-mail e na área do cliente. Ex.: referência do mês.">
        <input name="description" className="input" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4" />
        Enviar e-mail da nova fatura para o cliente
      </label>
      <Alert state={state} />
      <SubmitButton>Lançar fatura</SubmitButton>
    </form>
  );
}
