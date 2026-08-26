'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/admin';

const RESEND_COOLDOWN_SECONDS = 60;

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  // 'request'  -> tela pedindo para enviar o código
  // 'verify'   -> tela para digitar o código de 6 dígitos recebido por e-mail
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // shouldCreateUser: false -> só envia o código se ADMIN_EMAIL já existir
      // como usuário no Supabase Auth. Isso impede que qualquer pessoa crie
      // uma conta nova só por saber o e-mail; a conta admin precisa já ter
      // sido criada previamente (painel do Supabase > Authentication > Users).
      //
      // emailRedirectTo precisa ser uma URL absoluta (com protocolo e host).
      // Sem isso o Supabase rejeita a requisição com "Invalid path specified
      // in request URL". Ela só é usada se o e-mail contiver um link mágico;
      // como o fluxo aqui é por código de 6 dígitos, ela funciona como
      // fallback caso o usuário clique no link em vez de digitar o código.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: ADMIN_EMAIL,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        console.error('Erro ao enviar código de login:', otpError);
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setStep('verify');
      setLoading(false);
      startCooldown();
    } catch (err) {
      console.error('Erro ao enviar código de login:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: ADMIN_EMAIL,
        token: code.trim(),
        type: 'email',
      });

      if (verifyError) {
        console.error('Erro ao verificar código de login:', verifyError);
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError('Não foi possível iniciar a sessão. Solicite um novo código e tente novamente.');
        setLoading(false);
        return;
      }

      // Navegação "dura" para garantir que o middleware leia os cookies de
      // sessão já gravados antes de decidir se libera o acesso ao /admin.
      window.location.href = redirectTo;
    } catch (err) {
      console.error('Erro ao verificar código de login:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-noite px-4">
      <div className="w-full max-w-sm rounded-lg bg-ivory-100 p-8 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/images/logo-emblem.png"
            alt="Universo Encantado"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
            priority
          />
          <h1 className="text-center font-display text-2xl font-semibold text-ink-700">
            Painel Administrativo
          </h1>
          <p className="text-center text-xs text-ink-300">
            Acesso restrito à equipe Universo Encantado
          </p>
        </div>

        {step === 'request' && (
          <form onSubmit={handleSendCode} className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-ivory-200/50 px-3 py-2.5 text-sm text-ink-500">
              <Mail size={16} className="shrink-0 text-ink-300" />
              <span>{ADMIN_EMAIL}</span>
            </div>
            <p className="text-xs text-ink-300">
              Vamos enviar um código de acesso de 6 dígitos para este e-mail. O código expira em
              alguns minutos.
            </p>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-terracota-100 px-3 py-2 text-xs text-terracota-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enviar código de acesso'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-esmeralda-100 px-3 py-2 text-xs text-esmeralda-700">
              <ShieldCheck size={14} className="shrink-0" />
              <span>Código enviado para {ADMIN_EMAIL}. Confira também o spam.</span>
            </div>

            <input
              required
              autoFocus
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              className="input-store text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-terracota-100 px-3 py-2 text-xs text-terracota-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.trim().length < 6}
              className="btn-primary w-full"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar código'}
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={handleSendCode}
              className="w-full text-center text-xs text-ink-300 underline hover:text-dourado-700 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('request');
                setCode('');
                setError(null);
              }}
              className="w-full text-center text-xs text-ink-300 hover:text-dourado-700"
            >
              Usar outro método
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
