# Gestão de Clientes

Plataforma em Next.js para cadastrar clientes, produtos e faturas, com avisos por e-mail e área do cliente.

- **Admin** (`/admin`): clientes (nome, CPF, e-mail), produtos, lançamento de faturas (produto, valor e vencimento), marcar como paga, cancelar e ver o histórico de e-mails.
- **Cliente** (`/portal`): entra com e-mail **ou** CPF e senha, vê as próprias faturas e troca a senha.

## Rodando

O banco é MySQL. Em desenvolvimento ele roda em um container, e o app roda com `npm run dev`:

```bash
cp .env.example .env      # preencha AUTH_SECRET (openssl rand -base64 48), MYSQL_*, ADMIN_* e CRON_SECRET
npm install
docker compose up -d db   # MySQL em 127.0.0.1:3308
npm run db:deploy         # aplica as migrations
npm run seed              # cria/atualiza o admin a partir do .env
npm run dev               # http://localhost:3000
```

**Para mudar o schema**, edite `prisma/schema.prisma` e gere uma migration com `npx prisma migrate dev --name descricao`. Esse comando precisa criar um banco temporário, então rode-o com o usuário root: `DATABASE_URL="mysql://root:<MYSQL_ROOT_PASSWORD>@127.0.0.1:3308/faturas" npx prisma migrate dev --name ...`. Comite a pasta `prisma/migrations`. O servidor aplica as migrations sozinho ao subir.

## Fluxo do cliente

1. O admin cadastra o cliente. Por padrão vai um **convite por e-mail** com o link para criar a senha (válido por 7 dias).
2. O cliente define a senha e já entra logado no portal.
3. Na tela "Esqueci minha senha", o cliente informa o e-mail ou o CPF e recebe um link de redefinição (válido por 1 hora).

## E-mails automáticos

| Quando | Como |
|---|---|
| Fatura lançada | na hora (opcional, via checkbox) |
| Lembrete | `REMINDER_DAYS` dias antes do vencimento (ex.: `3`) |
| Vence hoje | no dia do vencimento |
| Em atraso | a cada `OVERDUE_REPEAT_DAYS` dias após o vencimento (`0` = desligado) |
| Pago / cancelado | quando o admin muda o status |

Os avisos agendados são **idempotentes**: cada um é registrado em `EmailLog` e não sai duas vezes. Uma falha de envio fica registrada e é tentada de novo na rodada seguinte. Se o vencimento de uma fatura mudar, os lembretes dela voltam a valer.

Há três formas de disparar a verificação. Use **uma** delas:

- `INTERNAL_CRON="true"`: o próprio servidor Next roda a verificação a cada hora. É o mais simples para um servidor sempre ligado.
- Cron externo chamando `GET /api/cron/notificacoes` com `Authorization: Bearer $CRON_SECRET`. Serve para Vercel Cron e similares.
- `npm run notify` no crontab do sistema.

Em `/admin/emails` também existe o botão "Verificar e enviar avisos agora".

### Enviando de verdade (MailerSend)

1. No MailerSend, verifique o seu domínio (Domains → registros DNS SPF/DKIM).
2. Crie um token de API (Integrations → API tokens) com permissão de envio de e-mail.
3. No `.env`:
   ```
   MAIL_DRIVER="mailersend"
   MAILERSEND_API_KEY="mlsn.xxxxx"
   MAIL_FROM="Financeiro <financeiro@seudominio.com.br>"   # domínio verificado
   MAIL_REPLY_TO="Contato <contato@seudominio.com.br>"     # opcional: para onde vão as respostas
   ```
4. Teste com `npm run mail:test -- seu@email.com` e reinicie o servidor.

Para outro provedor, implemente `send()` em [src/lib/mail/senders/custom.ts](src/lib/mail/senders/custom.ts) e use `MAIL_DRIVER="custom"`.

Os textos dos e-mails ficam em [src/lib/mail/templates.ts](src/lib/mail/templates.ts).

## Contratos e parcelas

Em **Admin → Contratos** você cadastra o contrato: cliente, produto, título, valor total, início, observações e o PDF (até 10 MB). Na página do contrato você lança as parcelas:

- **Valor fixo:** N parcelas iguais. A diferença de centavos fica na última, e cada valor pode ser editado.
- **Percentual:** por exemplo 30% / 30% / 40% do saldo. A soma precisa fechar 100%.
- **Vencimentos:** o 1º vencimento e o intervalo (mensal, bimestral, trimestral, semestral ou anual) geram as datas. Cada data pode ser ajustada.

A soma das parcelas precisa ser igual ao saldo ainda não parcelado.

Cada parcela vira uma fatura normal, com link de pagamento, lembretes e baixa automática.

- **E-mail do cronograma:** o cliente recebe um único e-mail com o cronograma, em vez de um e-mail por parcela.
- **Cancelar o contrato:** cancela as parcelas pendentes e mantém as pagas.
- **Reativar:** o saldo volta a poder ser parcelado.
- **Portal:** em "Meus contratos" o cliente vê o progresso, as parcelas e o PDF.

Os PDFs ficam em `STORAGE_DIR` (padrão `./storage`), fora da pasta pública. São servidos por `/api/contratos/<id>/pdf` só para o admin ou para o dono do contrato. Inclua essa pasta no backup.

## Pagamento online (InfinitePay)

Com `INFINITEPAY_API_KEY` no `.env`, cada fatura ganha um link do Checkout Integrado (Pix e/ou cartão). O link vai no botão **Pagar agora** dos e-mails e aparece também na fatura dentro do portal.

- **Chave de API:** no app da InfinitePay, em Vendas → Checkout → Configurações → Habilitar Checkout Integrado → criar API Key.
- **Opções:** `INFINITEPAY_METHODS`, `INFINITEPAY_INSTALLMENTS` (parcelas sem juros para o cliente) e `INFINITEPAY_PIX_DISCOUNT` (% de desconto no Pix).
- **Baixa automática:** acontece quando o cliente volta para `/pagamento/retorno`, ou quando a InfinitePay chama `/api/webhooks/infinitepay`. O webhook só é enviado se `APP_URL` for HTTPS.
- **Segurança:** o webhook da InfinitePay não é assinado. Por isso a fatura só é marcada como paga depois de conferir em `payment_check` que o pagamento existe e que o valor bate.
- **Valor alterado:** se o valor da fatura mudar, um novo link é gerado no próximo envio. No admin há o botão "Gerar novo link".

## Produção com Docker (faturas.steve.dev.br)

O `docker-compose.yml` sobe o MySQL (`db`) e o app (`app`, em `127.0.0.1:3100`). O Cloudflare Tunnel publica `http://localhost:3100` em `https://faturas.steve.dev.br`.

**Primeira instalação no servidor:**
```bash
git clone https://github.com/steve-pagno/portal_faturas.git && cd portal_faturas
# copie o .env de produção (não vai pelo Git); APP_URL precisa ser https://faturas.steve.dev.br
docker compose up -d --build
docker compose exec app tsx prisma/seed.ts     # cria o admin (se o banco estiver vazio)
```

**Atualizar:** `./deploy/update.sh`. O script faz um dump do MySQL em `backups/`, depois `git pull`, rebuild e aplica as migrations.

**Logs:** `docker compose logs -f app`

**Mandar um e-mail de teste:** `docker compose exec app tsx scripts/test-mail.ts voce@email.com`

**Backup:** o volume do MySQL (os dumps ficam em `backups/`), a pasta `storage/` (PDFs) e o `.env`.

## Estrutura

```
prisma/schema.prisma        User (admin/cliente), Product, Contract, Invoice, AuthToken, EmailLog
src/middleware.ts           protege /admin e /portal
src/lib/auth.ts             sessão (JWT em cookie httpOnly), requireAdmin/requireClient
src/lib/notifications.ts    regras de envio + rodada agendada
src/lib/mail/               sender plugável + templates
src/app/(auth)/             login, esqueci a senha, definir senha
src/app/admin/              painel do administrador
src/app/portal/             área do cliente
```

Valores ficam em centavos (`Int`). Vencimentos são datas puras, gravadas às 12:00 UTC. "Hoje" é calculado no fuso `America/Sao_Paulo`.

As migrations ficam em `prisma/migrations`. O container aplica as pendentes ao iniciar, com `prisma migrate deploy`.
