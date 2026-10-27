#!/usr/bin/env bash
# Atualiza a aplicação no servidor:  ./deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
# backup do banco antes de aplicar migrations
docker compose exec -T db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction faturas' \
  | gzip > "backups/faturas-$(date +%Y%m%d-%H%M%S).sql.gz" || echo "aviso: backup não realizado (banco ainda não existe?)"

git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
sleep 5
docker compose ps
docker compose logs --tail=20 app
