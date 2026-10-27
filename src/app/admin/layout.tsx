import { AppShell } from "@/components/shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell
      home="/admin"
      userName={user.name}
      links={[
        { href: "/admin", label: "Painel" },
        { href: "/admin/clientes", label: "Clientes" },
        { href: "/admin/contratos", label: "Contratos" },
        { href: "/admin/produtos", label: "Produtos" },
        { href: "/admin/faturas", label: "Faturas" },
        { href: "/admin/emails", label: "E-mails" },
        { href: "/admin/conta", label: "Minha conta" },
      ]}
    >
      {children}
    </AppShell>
  );
}
