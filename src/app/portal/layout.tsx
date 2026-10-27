import { AppShell } from "@/components/shell";
import { requireClient } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  return (
    <AppShell
      home="/portal"
      userName={user.name}
      links={[
        { href: "/portal", label: "Minhas faturas" },
        { href: "/portal/contratos", label: "Meus contratos" },
        { href: "/portal/conta", label: "Minha conta" },
      ]}
    >
      {children}
    </AppShell>
  );
}
