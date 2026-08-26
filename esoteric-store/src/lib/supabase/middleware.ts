import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_EMAIL } from '@/lib/admin';

// Rotas dentro de /admin que devem continuar acessíveis SEM sessão ativa
// (login e o fluxo de recuperação de senha). Qualquer outra rota sob /admin
// exige um usuário autenticado.
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/esqueci-senha', '/admin/redefinir-senha'];

// Atualiza a sessão Supabase Auth a cada requisição e protege as rotas /admin.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Importante: atualiza tanto a requisição atual quanto a resposta,
          // para que a sessão recém-criada no login já seja lida corretamente
          // na primeira navegação para /admin.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() (e não getSession()) é usado de propósito: ele revalida o
  // token diretamente com o servidor do Supabase, evitando falsos positivos
  // de sessão "presente" mas na verdade expirada/inválida.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Defesa em profundidade: mesmo que exista uma sessão válida, só o e-mail
  // configurado em ADMIN_EMAIL pode acessar o painel. Isso protege contra,
  // por exemplo, alguém reativar o cadastro automático (shouldCreateUser)
  // no futuro e criar uma conta com outro e-mail.
  const isAuthorizedUser = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (isAdminRoute && user && !isAuthorizedUser) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Bloqueia acesso ao painel para quem não está logado.
  if (isAdminRoute && !isPublicAdminPath && !isAuthorizedUser) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Evita que um usuário já logado veja a tela de login novamente.
  if (pathname === '/admin/login' && isAuthorizedUser) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
