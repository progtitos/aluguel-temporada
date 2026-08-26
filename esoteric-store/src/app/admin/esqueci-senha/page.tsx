'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl}/admin/redefinir-senha`,
    });

    setLoading(false);

    if (resetError) {
      setError('Não foi possível enviar o e-mail de recuperação. Tente novamente.');
      return;
    }

    // Por segurança, sempre mostramos a mesma mensagem de sucesso,
    // independentemente de o e-mail existir ou não como administrador.
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-noite px-4">
      <div className="w-full max-w-sm rounded-lg bg-ivory-100 p-8 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/images/logo-emblem.png"
            alt="Universo Encantado"
            width={56}
            height={56}
            className="h-14 w-14 rounded-full"
          />
          <h1 className="text-center font-display text-xl font-semibold text-ink-700">
            Recuperar senha
          </h1>
          <p className="text-center text-xs text-ink-300">
            Informe o e-mail de administrador para receber o link de redefinição.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="text-esmeralda-700" size={36} />
            <p className="text-sm text-ink-500">
              Se este e-mail estiver cadastrado como administrador, você receberá um link
              para redefinir sua senha em instantes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="E-mail"
              className="input-store"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-terracota-700">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1 text-xs text-ink-300 hover:text-dourado-700"
          >
            <ArrowLeft size={13} /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
