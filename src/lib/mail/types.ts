export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Contrato que qualquer provedor de e-mail precisa implementar. */
export interface MailSender {
  send(message: MailMessage & { from: string; replyTo?: string }): Promise<void>;
}
