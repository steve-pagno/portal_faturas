import type { MailSender } from "../types";

/** Sender de desenvolvimento: só imprime o e-mail no terminal. */
export const consoleSender: MailSender = {
  async send(message) {
    console.log(
      [
        "──────── E-MAIL (console) ────────",
        `De: ${message.from}`,
        `Para: ${message.to}`,
        ...(message.replyTo ? [`Responder para: ${message.replyTo}`] : []),
        `Assunto: ${message.subject}`,
        "",
        message.text,
        "──────────────────────────────────",
      ].join("\n"),
    );
  },
};
