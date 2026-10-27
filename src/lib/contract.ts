export type ContractStatus = "ATIVO" | "QUITADO" | "CANCELADO";

type InvoiceLike = { status: string; amountCents: number };

/** Resumo financeiro do contrato a partir das parcelas (faturas) não canceladas. */
export function contractSummary(contract: { status: string; totalCents: number }, invoices: InvoiceLike[]) {
  const active = invoices.filter((i) => i.status !== "CANCELED");
  const billed = active.reduce((s, i) => s + i.amountCents, 0);
  const paidList = active.filter((i) => i.status === "PAID");
  const paid = paidList.reduce((s, i) => s + i.amountCents, 0);
  const status: ContractStatus =
    contract.status === "CANCELED" ? "CANCELADO" : active.length > 0 && paidList.length === active.length && billed >= contract.totalCents ? "QUITADO" : "ATIVO";
  return {
    status,
    installments: active.length,
    paidInstallments: paidList.length,
    billed,
    paid,
    open: billed - paid,
    unbilled: Math.max(0, contract.totalCents - billed), // ainda não lançado em parcelas
  };
}

export function installmentLabel(inv: { installmentNumber: number | null; installmentCount: number | null }) {
  return inv.installmentNumber ? `Parcela ${inv.installmentNumber}/${inv.installmentCount ?? "?"}` : null;
}
