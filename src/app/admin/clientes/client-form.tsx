import { ActionForm, Field } from "@/components/forms";
import { formatCpf } from "@/lib/format";
import { saveClient } from "../actions";

type Client = { id: string; name: string; cpf: string | null; email: string; phone: string | null };

export function ClientForm({ client }: { client?: Client }) {
  return (
    <ActionForm action={saveClient.bind(null, client?.id ?? null)} submitLabel={client ? "Salvar" : "Cadastrar cliente"}>
      <Field label="Nome completo">
        <input name="name" className="input" defaultValue={client?.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF">
          <input name="cpf" className="input" defaultValue={client?.cpf ? formatCpf(client.cpf) : ""} placeholder="000.000.000-00" required />
        </Field>
        <Field label="Telefone (opcional)">
          <input name="phone" className="input" defaultValue={client?.phone ?? ""} />
        </Field>
      </div>
      <Field label="E-mail" hint="Faturas e avisos serão enviados para este endereço.">
        <input name="email" type="email" className="input" defaultValue={client?.email} required />
      </Field>
      {!client && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sendInvite" defaultChecked className="h-4 w-4" />
          Enviar e-mail de convite para o cliente criar a senha
        </label>
      )}
    </ActionForm>
  );
}
