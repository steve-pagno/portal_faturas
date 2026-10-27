import Link from "next/link";
import { ActionForm, Field } from "@/components/forms";
import { findValidToken } from "@/lib/tokens";
import { MIN_PASSWORD } from "@/lib/form";
import { setPasswordWithToken } from "../../actions";

export const metadata = { title: "Definir senha" };

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await findValidToken(token);

  if (!record) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-zinc-600">Este link é inválido ou expirou.</p>
        <Link href="/esqueci-senha" className="btn btn-primary w-full">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-zinc-600">
        Olá, <strong>{record.user.name}</strong>! {record.type === "INVITE" ? "Crie sua senha de acesso." : "Defina sua nova senha."}
      </p>
      <ActionForm action={setPasswordWithToken.bind(null, token)} submitLabel="Salvar senha" submitClassName="btn btn-primary w-full">
        <Field label="Nova senha" hint={`Mínimo de ${MIN_PASSWORD} caracteres`}>
          <input name="password" type="password" className="input" autoComplete="new-password" minLength={MIN_PASSWORD} required />
        </Field>
        <Field label="Confirme a senha">
          <input name="confirm" type="password" className="input" autoComplete="new-password" required />
        </Field>
      </ActionForm>
    </>
  );
}
