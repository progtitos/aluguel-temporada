import LoginButtons from "@/components/LoginButtons";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
        Painel administrativo
      </h1>
      <p className="mb-6 text-center text-sm text-ink/60">
        Entre com a conta autorizada para gerenciar as acomodações.
      </p>
      <LoginButtons redirectTo="/auth/callback?next=/admin" />
    </main>
  );
}
