import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { NavLink } from "./ui";

export function AppShell({
  home,
  links,
  userName,
  children,
}: {
  home: string;
  links: { href: string; label: string }[];
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href={home} className="mr-4 flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">$</span>
            Gestão de Clientes
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span className="hidden sm:inline">{userName}</span>
            <form action={logout}>
              <button className="btn btn-secondary py-1.5">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
