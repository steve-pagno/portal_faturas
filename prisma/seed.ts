import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// carrega o .env quando existir (no Docker as variáveis já vêm do compose)
try {
  process.loadEnvFile();
} catch {}

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrador";
  if (!email || !password) throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env");

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", name, passwordHash, active: true },
    create: { email, name, role: "ADMIN", passwordHash },
  });
  console.log(`Admin pronto: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
