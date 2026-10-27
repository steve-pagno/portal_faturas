import { ActionForm, Field } from "@/components/forms";
import { centsToInput, toDateInput } from "@/lib/format";
import { updateInvoice } from "../actions";

export function EditInvoiceForm({ invoice }: { invoice: { id: number; amountCents: number; dueDate: Date; description: string | null } }) {
  return (
    <ActionForm action={updateInvoice.bind(null, invoice.id)} submitLabel="Salvar alterações" submitClassName="btn btn-secondary">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor (R$)">
          <input name="amount" className="input" inputMode="decimal" defaultValue={centsToInput(invoice.amountCents)} required />
        </Field>
        <Field label="Vencimento">
          <input name="dueDate" type="date" className="input" defaultValue={toDateInput(invoice.dueDate)} required />
        </Field>
      </div>
      <Field label="Descrição">
        <input name="description" className="input" defaultValue={invoice.description ?? ""} />
      </Field>
    </ActionForm>
  );
}
