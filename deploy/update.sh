#!/usr/bin/env bash
# Atualiza e reinicia a aplicação em produção:  ./deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

cp prisma/dev.db "prisma/dev.db.bak-$(date +%Y%m%d-%H%M%S)"   # backup antes de mexer no schema
npm ci
npx prisma db push
npm run build
sudo systemctl restart clientes-steve
sleep 3
systemctl --no-pager --lines=5 status clientes-steve
