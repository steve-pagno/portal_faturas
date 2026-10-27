import { PageHeader } from "@/components/ui";
import { ClientForm } from "../client-form";

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="Novo cliente" />
      <div className="card max-w-2xl">
        <ClientForm />
      </div>
    </>
  );
}
