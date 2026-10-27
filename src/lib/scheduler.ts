import { runScheduledNotifications } from "./notifications";

const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

export function startScheduler() {
  const g = globalThis as unknown as { __notificationScheduler?: NodeJS.Timeout };
  if (g.__notificationScheduler) return;

  const run = async () => {
    // só dispara a partir de NOTIFY_FROM_HOUR (horário de Brasília), para não mandar aviso de madrugada
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(new Date()));
    if (hour < Number(process.env.NOTIFY_FROM_HOUR ?? 8)) return;
    try {
      const summary = await runScheduledNotifications();
      if (summary.sent || summary.failed) console.log("[agendador] notificações:", summary);
    } catch (e) {
      console.error("[agendador] erro:", e);
    }
  };

  setTimeout(run, 10_000);
  g.__notificationScheduler = setInterval(run, INTERVAL_MS);
  console.log("[agendador] notificações agendadas a cada hora");
}
