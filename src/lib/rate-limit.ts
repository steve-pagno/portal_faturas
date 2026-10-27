import { headers } from "next/headers";

// Limite simples em memória (um único processo). Suficiente para um servidor; se um dia
// rodar em várias instâncias, troque por Redis ou pela regra de rate limit da Cloudflare.
const hits = new Map<string, { count: number; resetAt: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

/** Retorna true se ainda pode tentar; false se estourou `limit` tentativas na janela. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export function resetRateLimit(key: string) {
  hits.delete(key);
}
