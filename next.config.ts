import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // build enxuto para a imagem Docker (ver Dockerfile)
  ...(process.env.BUILD_STANDALONE === "1" && { output: "standalone" }),
  experimental: {
    // upload do PDF do contrato vai por server action (padrão é 1 MB)
    serverActions: {
      bodySizeLimit: "15mb",
      // atrás do Cloudflare Tunnel: aceita o domínio público como origem dos formulários
      allowedOrigins: process.env.APP_URL ? [new URL(process.env.APP_URL).host] : [],
    },
  },
};

export default nextConfig;
