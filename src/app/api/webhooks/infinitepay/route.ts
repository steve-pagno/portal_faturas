import { NextResponse } from "next/server";
import { confirmAndNotify, readPaymentParams } from "@/lib/payments";

export const dynamic = "force-dynamic";

// O webhook não é assinado: usamos o corpo só para saber QUAL pedido conferir;
// a baixa depende da confirmação via payment_check (ver lib/infinitepay.ts).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  console.log("[infinitepay] webhook recebido:", JSON.stringify(body));
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const input = readPaymentParams((k) => body[k]);
  if (!input) return NextResponse.json({ ok: true, ignored: "sem order_nsu/transaction_nsu" });

  try {
    const result = await confirmAndNotify(input);
    return NextResponse.json({ ok: true, status: result.status });
  } catch (e) {
    console.error("[infinitepay] erro no webhook:", e);
    // 500 → a InfinitePay tenta entregar de novo
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
