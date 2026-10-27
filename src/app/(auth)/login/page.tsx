import Link from "next/link";
import { ActionForm, Field } from "@/components/forms";
import { login } from "../actions";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <ActionForm action={login} submitLabel="Entrar" submitClassName="btn btn-primary w-full">
        <Field label="E-mail ou CPF">
          <input name="identifier" className="input" autoComplete="username" required autoFocus />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" className="input" autoComplete="current-password" required />
        </Field>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/esqueci-senha" className="link">
          Esqueci minha senha
        </Link>
      </p>
    </>
  );
}
