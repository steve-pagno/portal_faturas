import { ActionForm, Field } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { changePassword } from "@/app/portal/actions";
import { updateAdminProfile } from "../actions";

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="Minha conta" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Dados de acesso</h2>
          <ActionForm action={updateAdminProfile} submitLabel="Salvar">
            <Field label="Nome">
              <input name="name" className="input" defaultValue={admin.name} required />
            </Field>
            <Field label="E-mail (usado no login e na recuperação de senha)">
              <input name="email" type="email" className="input" defaultValue={admin.email} required />
            </Field>
          </ActionForm>
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
