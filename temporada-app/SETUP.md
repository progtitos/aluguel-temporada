# Guia de Configuração — Aluguel por Temporada

Stack: Next.js (App Router) + Supabase (DB, Auth, Storage) + Mercado Pago + Vercel.
Custo de infraestrutura: **R$ 0** (todos os planos free tier).

---

## 1. Supabase

### 1.1 Criar o projeto
1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Escolha uma senha forte para o banco (guarde-a) e a região `South America (São Paulo)`.

### 1.2 Rodar o schema SQL
1. No painel, abra **SQL Editor**.
2. Rode, **nesta ordem**, o conteúdo de cada arquivo da pasta `supabase/`:
   - `01_schema.sql` (tabelas)
   - `02_rls_policies.sql` (segurança/RLS)
   - `03_storage.sql` (bucket de fotos)
   - `04_seed.sql` (opcional — cria os 3 imóveis de exemplo, que você edita depois pelo `/admin`)
   - `05_pricing_checkin_and_profiles.sql` (tarifas semana/fds, feriados, perfil do hóspede, check-in/out)
   - `06_minimo_noites.sql` (estadia mínima configurável por imóvel)
   - `07_guest_cpf.sql` (CPF do hóspede — exigido pelo Mercado Pago para gerar o Pix)
   - `08_janela_disponibilidade.sql` (janela de disponibilidade do calendário — 1/2/3 meses ou sem limite)

   ⚠️ **Atenção**: o arquivo `05` **remove a coluna `price_per_night`** (substituída por `preco_semana`/`preco_fds`). Rode os arquivos em ordem, sempre antes de fazer deploy do código correspondente.

### 1.3 Pegar as chaves de API
Em **Project Settings → API**, copie:
- `Project URL` → variável `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → variável `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (em "Project API keys", clique em "Reveal") → variável `SUPABASE_SERVICE_ROLE_KEY`
  - ⚠️ **Nunca** exponha a `service_role` no client. Ela só é usada nas rotas de servidor (`/api/...`).

### 1.4 Configurar a URL de redirecionamento do Auth
Em **Authentication → URL Configuration**:
- **Site URL**: `https://seu-dominio.vercel.app`
- **Redirect URLs**: adicione
  - `https://seu-dominio.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (para testar localmente)

---

## 2. Login social — Google (exclusivo do painel `/admin`)

> ℹ️ **O fluxo de reserva do hóspede não usa mais login social.** O hóspede reserva direto, preenchendo nome, e-mail, WhatsApp e CPF no próprio checkout — sem OAuth, sem redirecionamento, sem perda da seleção de datas. Google e Apple aqui servem **apenas** para você (o dono do imóvel) entrar no `/admin`.

1. Vá em [console.cloud.google.com](https://console.cloud.google.com) → crie um projeto (ou use um existente).
2. **APIs e Serviços → Tela de consentimento OAuth**: configure como "Externo", preencha nome do app, e-mail de suporte.
3. **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**
   - **Origens JavaScript autorizadas**: `https://SEU-PROJETO.supabase.co`
   - **URIs de redirecionamento autorizados**: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
4. Copie o **Client ID** e o **Client Secret**.
5. No Supabase: **Authentication → Providers → Google** → cole as chaves → **Enable** → Salvar.

---

## 3. Login social — Apple (opcional, também exclusivo do `/admin`)

> Requer conta paga no **Apple Developer Program** (US$ 99/ano). É o único item pago do projeto — caso não queira arcar com esse custo, deixe apenas o login Google habilitado e remova o botão da Apple em `components/LoginButtons.tsx`.

1. Em [developer.apple.com](https://developer.apple.com) → **Certificates, IDs & Profiles**:
   - Crie um **App ID** com o serviço "Sign in with Apple" habilitado.
   - Crie um **Services ID** (ex.: `com.seudominio.web`) — este será usado como Client ID.
   - Em "Sign in with Apple" desse Services ID, configure o domínio (`SEU-PROJETO.supabase.co`) e a Return URL: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
   - Crie uma **Key** com "Sign in with Apple" habilitado e baixe o arquivo `.p8` (só pode baixar uma vez).
2. No Supabase: **Authentication → Providers → Apple** → preencha Services ID, Team ID, Key ID e o conteúdo da chave `.p8` → **Enable** → Salvar.

---

## 4. Mercado Pago

### 4.1 Credenciais
1. Acesse [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel) → crie uma aplicação.
2. Em **Credenciais de produção**, copie o **Access Token** → variável `MP_ACCESS_TOKEN`.
   - Use as **credenciais de teste** enquanto desenvolve, e troque para produção só quando for para o ar.

### 4.2 Webhook
1. Na mesma aplicação, vá em **Webhooks → Configurar notificações**.
2. URL do webhook: `https://seu-dominio.vercel.app/api/mercadopago/webhook`
3. Eventos: marque **Pagamentos**.
4. Salve. É esta rota que confirma a reserva automaticamente assim que o pagamento é aprovado — o hóspede nunca "confirma" a reserva sozinho.

### 4.3 Pix
Para receber via Pix é necessário que sua conta Mercado Pago tenha o Pix habilitado (normalmente automático para contas brasileiras verificadas).

O Mercado Pago **exige** `payer.first_name`, `payer.last_name` e `payer.identification` (CPF) para gerar a cobrança Pix — por isso o checkout pede nome completo e CPF antes de gerar o pagamento (gravados direto em `bookings.guest_cpf`, sem exigir login). Sem isso, a API do MP rejeita a criação do pagamento.

### 4.4 `notification_url` em ambiente local

A API do Mercado Pago rejeita `notification_url` (e `back_urls`) quando o valor não é uma URL pública em HTTPS — o que sempre acontece ao rodar `npm run dev` localmente (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`). O app (`lib/siteUrl.ts`) detecta isso automaticamente e **omite esses campos do payload** quando não há uma URL HTTPS válida configurada, em vez de quebrar a chamada. Na prática:
- **Local**: o Pix/Cartão são gerados normalmente, mas o webhook não é acionado (Mercado Pago não tem para onde notificar) — a reserva fica em `pendente` até você confirmar manualmente no Supabase, o que é esperado em teste.
- **Produção (Vercel)**: assim que `NEXT_PUBLIC_SITE_URL` estiver configurada como a URL pública HTTPS do seu domínio, tudo funciona automaticamente, incluindo a confirmação via webhook.

---

## 4.5 Geocodificação de endereços (gratuita)

O botão "Buscar coordenadas pelo endereço" no editor de cada imóvel usa a API pública do [Nominatim](https://nominatim.org) (OpenStreetMap) — gratuita, sem chave de API, mantendo a infra 100% free tier. Não é necessário configurar nada: basta o admin preencher o "Endereço completo" e clicar no botão para preencher latitude/longitude automaticamente.

---

## 5. Deploy na Vercel

1. Suba o código para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione todas as variáveis do `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS` (seu e-mail, o mesmo usado no login Google/Apple)
   - `MP_ACCESS_TOKEN`
   - `NEXT_PUBLIC_SITE_URL` (depois do primeiro deploy, atualize com a URL final da Vercel e faça um redeploy)
4. Clique em **Deploy**.
5. Depois do primeiro deploy, volte no Supabase (passo 1.4) e no Mercado Pago (passo 4.2) e confirme que as URLs usam o domínio final da Vercel.

---

## 6. Testando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves
npm run dev
```

Acesse `http://localhost:3000` para o site e `http://localhost:3000/admin` para o painel.

---

## 7. Acessando o painel administrativo

1. Acesse `/admin`.
2. Clique em "Entrar com Google" (ou Apple) usando o e-mail que você colocou em `ADMIN_EMAILS`.
3. Você terá acesso a:
   - **Visão geral**: faturamento confirmado, reservas confirmadas/pendentes.
   - **Cada imóvel**: upload de fotos, edição de preços/textos, bloqueio manual de datas.

Qualquer outro e-mail que fizer login será redirecionado de volta para a tela de login — o acesso ao `/admin` é controlado pelo middleware (`lib/supabase/middleware.ts`) comparando o e-mail logado com a lista em `ADMIN_EMAILS`.

---

## 8. Fluxo de reserva (resumo técnico)

1. Hóspede escolhe as datas em `/imovel/[slug]` → `BookingWidget`. O preço é calculado por `lib/pricing.ts` (semana/fim de semana/feriado), a estadia mínima do imóvel (`minimo_noites`) é validada antes de liberar o avanço, e o calendário desabilita automaticamente tanto os bloqueios manuais/reservas existentes quanto as datas fora da **janela de disponibilidade** configurada (`janela_disponibilidade_meses` — 1/2/3 meses ou sem limite).
2. **Sem login**: o hóspede preenche nome completo, e-mail, WhatsApp e CPF direto no checkout (etapa "dados"). Nenhuma conta é criada, não há redirecionamento — o CPF é exigido pelo Mercado Pago para gerar o Pix.
3. Escolhe Pix ou Cartão → `POST /api/bookings` valida tudo no servidor (estadia mínima, janela de disponibilidade, formato de e-mail/telefone/CPF), recalcula o preço a partir das tarifas cadastradas (nunca confia no valor do client), cria a reserva com status `pendente` (o banco impede overbooking via trigger) e gera o pagamento no Mercado Pago.
4. Mercado Pago notifica `POST /api/mercadopago/webhook` quando o status do pagamento muda (apenas quando há uma URL pública HTTPS configurada — ver seção 4.4).
5. O webhook consulta o pagamento **diretamente na API do Mercado Pago** (não confia no payload recebido) e só então marca a reserva como `confirmada`.

> O login social (Google/Apple) continua existindo no projeto, mas hoje é usado **apenas** para você acessar o `/admin` — não faz mais parte do fluxo de reserva do hóspede.

---

## 9. Limites do free tier a ficar de olho

- **Supabase Free**: 500 MB de banco, 1 GB de Storage, projeto pausado após 7 dias sem uso (basta reativar no painel).
- **Vercel Hobby**: uso pessoal/não comercial nos termos da Vercel — para um negócio real de temporada, considere o plano Pro no futuro.
- **Mercado Pago**: sem custo de integração; taxas normais por transação aprovada.
