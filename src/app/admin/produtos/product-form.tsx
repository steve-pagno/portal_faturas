import { ActionForm, Field } from "@/components/forms";
import { centsToInput } from "@/lib/format";
import { saveProduct } from "../actions";

type Product = { id: string; name: string; description: string | null; priceCents: number };

export function ProductForm({ product }: { product?: Product }) {
  return (
    <ActionForm action={saveProduct.bind(null, product?.id ?? null)} submitLabel={product ? "Salvar" : "Cadastrar produto"}>
      <Field label="Nome">
        <input name="name" className="input" defaultValue={product?.name} required />
      </Field>
      <Field label="Descrição (opcional)">
        <textarea name="description" className="input" rows={2} defaultValue={product?.description ?? ""} />
      </Field>
      <Field label="Valor sugerido (R$)" hint="Preenche automaticamente o valor ao lançar uma fatura; pode ser alterado.">
        <input name="price" className="input" inputMode="decimal" placeholder="0,00" defaultValue={product ? centsToInput(product.priceCents) : ""} />
      </Field>
    </ActionForm>
  );
}
