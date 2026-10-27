# ---------- build ----------
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
# APP_URL entra na configuração do Next em tempo de build (origem permitida dos formulários)
ARG APP_URL=https://faturas.steve.dev.br
ENV APP_URL=$APP_URL BUILD_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
 && npm install -g prisma@6.19.3 tsx@4 && npm cache clean --force
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    PORT=3100 HOSTNAME=0.0.0.0 STORAGE_DIR=/app/storage

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY prisma ./prisma
COPY scripts ./scripts
COPY src/lib ./src/lib
COPY tsconfig.json docker-entrypoint.sh ./

RUN mkdir -p /app/storage && chmod +x docker-entrypoint.sh
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3100/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
