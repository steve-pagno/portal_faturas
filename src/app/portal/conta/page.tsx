import { ActionForm, Field } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { formatCpf } from "@/lib/format";
import { changePassword } from "../actions";

export default async function AccountPage() {
  const user = await requireClient();
  return (
    <>
      <PageHeader title="Minha conta" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Dados cadastrais</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Nome</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">CPF</dt>
              <dd>{formatCpf(user.cpf)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">E-mail</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-zinc-500">Para alterar seus dados, entre em contato conosco.</p>
        </section>
        <section className="card">
          <h2 className="mb-4 font-semibold">Alterar senha</h2>
          <ActionForm action={changePassword} submitLabel="Alterar senha">
            <Field label="Senha atual">
              <input name="current" type="password" className="input" autoComplete="current-password" required />
            </Field>
            <Field label="Nova senha">
              <input name="password" type="password" className="input" autoComplete="new-password" required />
            </Field>
            <Field label="Confirme a nova senha">
              <input name="confirm" type="password" className="input" autoComplete="new-password" required />
            </Field>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
