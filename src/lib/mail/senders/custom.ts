import type { MailSender } from "../types";

/**
 * TODO: plugar aqui o seu mail sender (SMTP/nodemailer, Resend, SES, SendGrid, API própria...).
 * Basta implementar `send` e definir MAIL_DRIVER="custom" no .env.
 * Se o envio falhar, lance um erro: ele fica registrado em "E-mails" no painel e o
 * lembrete é tentado de novo na próxima execução.
 */
export const customSender: MailSender = {
  async send() {
    throw new Error("Mail sender 'custom' ainda não implementado (src/lib/mail/senders/custom.ts)");
  },
};
