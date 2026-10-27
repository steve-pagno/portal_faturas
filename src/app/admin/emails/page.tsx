import { ActionForm } from "@/components/forms";
import { EmailLogTable } from "@/components/email-log-table";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { runNotificationsNow } from "../actions";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const logs = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const reminderDays = process.env.REMINDER_DAYS || "5,1";
  const overdueRepeat = process.env.OVERDUE_REPEAT_DAYS || "7";

  return (
    <>
      <PageHeader title="E-mails" subtitle="Histórico dos últimos 200 envios" />
      <section className="card mb-6">
        <h2 className="font-semibold">Avisos automáticos</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-zinc-600">
          <li>Nova fatura: no momento do lançamento</li>
          <li>Lembrete: {reminderDays.split(",").join(" e ")} dia(s) antes do vencimento</li>
          <li>No dia do vencimento</li>
          {overdueRepeat !== "0" && <li>Em atraso: no dia seguinte ao vencimento e depois a cada {overdueRepeat} dias</li>}
          <li>Pagamento confirmado e fatura cancelada</li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Driver atual: <code>{process.env.MAIL_DRIVER || "console"}</code>. A verificação roda automaticamente a cada hora; você pode forçar agora:
        </p>
        <ActionForm action={runNotificationsNow} submitLabel="Verificar e enviar avisos agora" className="mt-3 space-y-3" submitClassName="btn btn-secondary">
          {null}
        </ActionForm>
      </section>
      <section className="card">
        <EmailLogTable logs={logs} />
      </section>
    </>
  );
}
