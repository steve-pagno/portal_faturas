// Envia um e-mail de teste com o driver configurado:  npm run mail:test -- voce@email.com
import { sendMail } from "../src/lib/mail";

// carrega o .env quando existir (no Docker as variáveis já vêm do compose)
try {
  process.loadEnvFile();
} catch {}

const to = process.argv[2];
if (!to) {
  console.error("Uso: npm run mail:test -- destinatario@email.com");
  process.exit(1);
}

sendMail({
  to,
  subject: "Teste de envio — Gestão de Clientes",
  text: `Se você recebeu este e-mail, o driver "${process.env.MAIL_DRIVER}" está funcionando.`,
  html: `<p>Se você recebeu este e-mail, o driver <strong>${process.env.MAIL_DRIVER}</strong> está funcionando.</p>`,
})
  .then(() => console.log(`Enviado para ${to} via ${process.env.MAIL_DRIVER}`))
  .catch((e) => {
    console.error("Falhou:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
