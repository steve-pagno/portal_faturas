#!/bin/sh
set -e

# volumes montados do host podem vir com dono root: ajusta e depois roda sem privilégios
chown -R node:node /app/storage

# aplica as migrations pendentes (prisma/migrations) antes de subir
setpriv --reuid=node --regid=node --init-groups prisma migrate deploy --schema prisma/schema.prisma

exec setpriv --reuid=node --regid=node --init-groups "$@"
