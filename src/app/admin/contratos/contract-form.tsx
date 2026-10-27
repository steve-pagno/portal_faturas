import { ActionForm, Field } from "@/components/forms";
import { centsToInput, formatBytes, formatCpf, toDateInput } from "@/lib/format";
import { saveContract } from "./actions";

type Contract = {
  id: string;
  userId: string;
  productId: string;
  title: string;
  description: string | null;
  totalCents: number;
  startDate: Date | null;
  pdfName: string | null;
  pdfSize: number | null;
};

export function ContractForm({
  contract,
  clients,
  products,
  defaultClientId,
}: {
  contract?: Contract;
  clients: { id: string; name: string; cpf: string | null }[];
  products: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  return (
    <ActionForm action={saveContract.bind(null, contract?.id ?? null)} submitLabel={contract ? "Salvar contrato" : "Criar contrato"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente">
          <select name="userId" className="input" defaultValue={contract?.userId ?? defaultClientId ?? ""} disabled={Boolean(contract)} required>
            <option value="" disabled>
              Selecione...
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {formatCpf(c.cpf)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Produto / serviço">
          <select name="productId" className="input" defaultValue={contract?.productId ?? ""} required>
            <option value="" disabled>
              Selecione...
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Título do contrato" hint="Aparece para o cliente nos e-mails e no portal.">
        <input name="title" className="input" defaultValue={contract?.title} placeholder="Ex.: Desenvolvimento do site institucional" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor total (R$)">
          <input name="total" className="input" inputMode="decimal" placeholder="0,00" defaultValue={contract ? centsToInput(contract.totalCents) : ""} required />
        </Field>
        <Field label="Início (opcional)">
          <input name="startDate" type="date" className="input" defaultValue={contract?.startDate ? toDateInput(contract.startDate) : ""} />
        </Field>
      </div>
      <Field label="Observações (opcional)">
        <textarea name="description" className="input" rows={3} defaultValue={contract?.description ?? ""} />
      </Field>
      <Field
        label={contract?.pdfName ? "Substituir PDF do contrato" : "PDF do contrato (opcional)"}
        hint={contract?.pdfName ? `Atual: ${contract.pdfName} (${formatBytes(contract.pdfSize ?? 0)}). Máx. 10 MB.` : "Máx. 10 MB."}
      >
        <input name="pdf" type="file" accept="application/pdf,.pdf" className="input file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm" />
      </Field>
    </ActionForm>
  );
}
