export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">$</div>
          <h1 className="text-xl font-semibold">Área do Cliente</h1>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
