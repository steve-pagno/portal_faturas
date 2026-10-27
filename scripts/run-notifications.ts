// Roda uma rodada de notificações agendadas pela linha de comando (ex.: crontab).
//   0 8 * * * cd /caminho/do/projeto && npm run notify
import { runScheduledNotifications } from "../src/lib/notifications";
import { db } from "../src/lib/db";

// carrega o .env quando existir (no Docker as variáveis já vêm do compose)
try {
  process.loadEnvFile();
} catch {}

runScheduledNotifications()
  .then((summary) => console.log("Notificações:", summary))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
