import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// PDF do contrato: admin vê qualquer um; cliente só os próprios.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.APP_URL || req.url));

  const { id } = await params;
  const contract = await db.contract.findUnique({ where: { id } });
  if (!contract?.pdfPath || (user.role !== "ADMIN" && contract.userId !== user.id)) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const file = await readStoredFile(contract.pdfPath).catch(() => null);
  if (!file) return new NextResponse("Arquivo não encontrado", { status: 404 });

  const name = (contract.pdfName || "contrato.pdf").replace(/["\\\r\n]/g, "");
  const download = new URL(req.url).searchParams.has("download");
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="contrato.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
