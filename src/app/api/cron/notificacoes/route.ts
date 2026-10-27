import { NextResponse } from "next/server";
import { runScheduledNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// Para cron externo (Vercel Cron, crontab + curl, etc.):
//   curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/notificacoes
async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runScheduledNotifications();
  return NextResponse.json(summary);
}

export { handler as GET, handler as POST };
