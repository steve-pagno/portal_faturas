import type { MailMessage, MailSender } from "./types";
import { consoleSender } from "./senders/console";
import { customSender } from "./senders/custom";
import { mailersendSender } from "./senders/mailersend";

const senders: Record<string, MailSender> = {
  console: consoleSender,
  custom: customSender,
  mailersend: mailersendSender,
};

export async function sendMail(message: MailMessage) {
  const driver = process.env.MAIL_DRIVER || "console";
  const sender = senders[driver];
  if (!sender) throw new Error(`MAIL_DRIVER desconhecido: ${driver}`);
  await sender.send({
    ...message,
    from: process.env.MAIL_FROM || "no-reply@localhost",
    replyTo: process.env.MAIL_REPLY_TO || undefined,
  });
}

export type { MailMessage, MailSender };
