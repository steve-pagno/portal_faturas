import Link from "next/link";
import { ActionForm, Field } from "@/components/forms";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="mb-4 text-sm text-zinc-600">Informe seu e-mail ou CPF. Enviaremos um link para você criar uma nova senha.</p>
      <ActionForm action={requestPasswordReset} submitLabel="Enviar link" submitClassName="btn btn-primary w-full">
        <Field label="E-mail ou CPF">
          <input name="identifier" className="input" required autoFocus />
        </Field>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="link">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
