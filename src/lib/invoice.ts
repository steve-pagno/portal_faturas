import { daysUntil } from "./format";

export type InvoiceStatus = "PENDING" | "PAID" | "CANCELED";
export type DisplayStatus = "PENDENTE" | "VENCIDA" | "PAGA" | "CANCELADA";

export function displayStatus(invoice: { status: string; dueDate: Date }): DisplayStatus {
  if (invoice.status === "PAID") return "PAGA";
  if (invoice.status === "CANCELED") return "CANCELADA";
  return daysUntil(invoice.dueDate) < 0 ? "VENCIDA" : "PENDENTE";
}
