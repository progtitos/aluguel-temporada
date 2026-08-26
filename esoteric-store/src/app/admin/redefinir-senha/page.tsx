'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();

  // 'checking' | 'ready' | 'invalid' | 'success'
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'success'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function prepareSession() {
      // O Supabase pode enviar o link de recuperação de duas formas:
      // 1) Fluxo PKCE: ?code=xxxx na querystring — precisa trocar por sessão.
      // 2) Fluxo implícito: #access_token=xxxx no hash — o client já detecta
      //    automaticamente ao ser inicializado (detectSessionInUrl).
      const code = searchParams.get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setStatus('invalid');
          return;
        }
        setStatus('ready');
        return;
      }

      // Fluxo implícito: aguarda o client processar o hash da URL.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus('ready');
      } else {
        setStatus('invalid');
      }
    }

    prepareSession();

    // Garante que capturamos o evento também se ele disparar um pouco depois
    // (ex: processamento assíncrono do hash pela biblioteca).
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready');
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError('Não foi possível salvar a nova senha. Solicite um novo link e tente de novo.');
      return;
    }

    setStatus('success');
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 2000);
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
            Redefinir senha
          </h1>
        </div>

        {status === 'checking' && (
          <div className="flex flex-col items-center gap-2 py-6 text-ink-500">
            <Loader2 className="animate-spin" size={22} />
            <p className="text-sm">Verificando link de recuperação...</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="text-terracota-700" size={32} />
            <p className="text-sm text-ink-500">
              Este link de redefinição é inválido ou já expirou. Solicite um novo link.
            </p>
            <Link href="/admin/esqueci-senha" className="btn-secondary mt-2">
              Solicitar novo link
            </Link>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="text-esmeralda-700" size={32} />
            <p className="text-sm text-ink-500">
              Senha atualizada com sucesso! Redirecionando para o login...
            </p>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              type="password"
              placeholder="Nova senha"
              minLength={6}
              className="input-store"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              required
              type="password"
              placeholder="Confirmar nova senha"
              minLength={6}
              className="input-store"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <p className="text-sm text-terracota-700">{error}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
