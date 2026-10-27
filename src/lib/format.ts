const TIMEZONE = "America/Sao_Paulo";

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function formatCpf(value: string | null | undefined) {
  if (!value) return "—";
  const d = onlyDigits(value);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : value;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(cents: number) {
  return currency.format(cents / 100);
}

/** Aceita "1.234,56", "1234,56", "1234.56" ou "1234". Retorna centavos ou null. */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/* Datas de vencimento são "datas puras": guardamos como 12:00 UTC do dia, e
   sempre formatamos/comparamos em UTC para não sofrer com fuso horário. */

export function dateInputToDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" });
}

/** "Hoje" no fuso de São Paulo, como data pura (12:00 UTC). */
export function today(): Date {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
  return dateInputToDate(key)!;
}

/** Dias até o vencimento (negativo = dias em atraso). */
export function daysUntil(dueDate: Date) {
  return Math.round((dueDate.getTime() - today().getTime()) / 86_400_000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function invoiceNumber(id: number) {
  return `#${String(id).padStart(6, "0")}`;
}

/** Soma meses a uma data pura, limitando ao último dia do mês (31/01 + 1 mês → 28/02). */
export function addMonths(date: Date, months: number) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDay), 12));
}

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
