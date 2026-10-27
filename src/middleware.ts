import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Primeira barreira (só verifica o JWT). Cada página/ação ainda valida o usuário no banco.
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  // atrás do túnel, req.url aponta para o host interno (localhost:3100); usamos o domínio público
  const to = (path: string) => NextResponse.redirect(new URL(path, process.env.APP_URL || req.url));

  if (pathname === "/login") {
    if (session) return to(session.role === "ADMIN" ? "/admin" : "/portal");
    return NextResponse.next();
  }
  if (!session) return to("/login");
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") return to("/portal");
  if (pathname.startsWith("/portal") && session.role === "ADMIN") return to("/admin");
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/login"],
};
