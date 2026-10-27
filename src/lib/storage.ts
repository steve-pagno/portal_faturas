import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

const root = () => path.resolve(process.env.STORAGE_DIR || "./storage");

/** Valida e grava um PDF. Retorna o caminho relativo a STORAGE_DIR. */
export async function savePdf(folder: string, file: File) {
  if (file.size > MAX_PDF_BYTES) throw new Error("O PDF deve ter no máximo 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("O arquivo enviado não é um PDF válido.");

  const rel = path.posix.join(folder, `${Date.now()}-${randomBytes(6).toString("hex")}.pdf`);
  await mkdir(path.join(root(), folder), { recursive: true });
  await writeFile(path.join(root(), rel), bytes);
  return rel;
}

function resolveSafe(rel: string) {
  const full = path.resolve(root(), rel);
  if (!full.startsWith(root() + path.sep)) throw new Error("Caminho de arquivo inválido");
  return full;
}

export function readStoredFile(rel: string) {
  return readFile(resolveSafe(rel));
}

export async function deleteStoredFile(rel: string | null | undefined) {
  if (!rel) return;
  await unlink(resolveSafe(rel)).catch(() => {});
}
