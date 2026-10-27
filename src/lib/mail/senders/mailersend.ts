import type { MailSender } from "../types";

const API_URL = "https://api.mailersend.com/v1/email";

/** "Financeiro <financeiro@dominio.com>" → { name, email } */
function parseAddress(value: string) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  return m ? { name: m[1].replace(/^"|"$/g, "") || undefined, email: m[2] } : { email: value.trim() };
}

/** Envio via API do MailerSend (https://developers.mailersend.com/api/v1/email.html). */
export const mailersendSender: MailSender = {
  async send({ from, replyTo, to, subject, html, text }) {
    const apiKey = process.env.MAILERSEND_API_KEY || process.env.MAILERSEND_API_TOKEN;
    if (!apiKey) throw new Error("MAILERSEND_API_KEY (ou MAILERSEND_API_TOKEN) não definido no .env");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        from: parseAddress(from),
        ...(replyTo && { reply_to: parseAddress(replyTo) }),
        to: [{ email: to }],
        subject,
        html,
        text,
      }),
    });

    // 202 = aceito para envio
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`MailerSend ${res.status}: ${body.slice(0, 500)}`);
    }
  },
};
