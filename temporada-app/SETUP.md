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
   - `09_coupons.sql` (cupons de desconto — tabela `coupons`, colunas de cupom em `bookings` e o trigger que consome o uso ao confirmar a reserva)
   - `10_amenities.sql` (comodidades do imóvel — wifi, piscina, estacionamento etc., exibidas com ícones na página do imóvel)

   ⚠️ **Atenção**: o arquivo `05` **remove a coluna `price_per_night`** (substituída por `preco_semana`/`preco_fds`). Rode os arquivos em ordem, sempre antes de fazer deploy do código correspondente.

### 1.3 Pegar as chaves de API
Em **Project Settings → API**, copie:
- `Project URL` → variável `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → variável `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (em "Project API keys", clique em "Reveal") → variável `SUPABASE_SERVICE_ROLE_KEY`
  - ⚠️ **Nunca** exponha a `service_role` no client. Ela só é usada nas rotas de servidor (`/api/...`).

### 1.4 Criar seu usuário de admin (e-mail + senha)

O painel `/admin` não usa mais login social — é e-mail e senha direto pelo Supabase Auth. Você mesmo cria seu usuário pelo painel, sem precisar de nenhuma tela de cadastro pública (não existe uma, de propósito: só o dono do imóvel deve conseguir criar contas):

1. No Supabase, vá em **Authentication → Users → Add user → Create new user**.
2. Preencha seu e-mail e uma senha forte.
3. Marque **Auto Confirm User** (assim você já consegue logar na hora, sem precisar clicar em link de confirmação por e-mail).
4. Confirme que o **provider "Email"** está habilitado em **Authentication → Providers** (vem habilitado por padrão — não precisa configurar nada além disso).
5. Coloque esse mesmo e-mail na variável de ambiente `ADMIN_EMAILS` (ver seção 3 — Deploy na Vercel). É essa variável que decide quem tem acesso ao `/admin`, independente de estar logado ou não.

Quer dar acesso a mais de uma pessoa? Repita os passos 1–3 para cada uma e liste todos os e-mails em `ADMIN_EMAILS`, separados por vírgula.

---

## 2. Mercado Pago

### 2.1 Credenciais
1. Acesse [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel) → crie uma aplicação.
2. Em **Credenciais de produção**, copie o **Access Token** → variável `MP_ACCESS_TOKEN`.
   - Use as **credenciais de teste** enquanto desenvolve, e troque para produção só quando for para o ar.

### 2.2 Webhook
1. Na mesma aplicação, vá em **Webhooks → Configurar notificações**.
2. URL do webhook: `https://seu-dominio.vercel.app/api/mercadopago/webhook`
3. Eventos: marque **Pagamentos**.
4. Salve. É esta rota que confirma a reserva automaticamente assim que o pagamento é aprovado — o hóspede nunca "confirma" a reserva sozinho.

### 2.3 Pix
Para receber via Pix é necessário que sua conta Mercado Pago tenha o Pix habilitado (normalmente automático para contas brasileiras verificadas).

O Mercado Pago **exige** `payer.first_name`, `payer.last_name` e `payer.identification` (CPF) para gerar a cobrança Pix — por isso o checkout pede nome completo e CPF antes de gerar o pagamento (gravados direto em `bookings.guest_cpf`, sem exigir login). Sem isso, a API do MP rejeita a criação do pagamento.

### 2.4 `notification_url` em ambiente local

A API do Mercado Pago rejeita `notification_url` (e `back_urls`) quando o valor não é uma URL pública em HTTPS — o que sempre acontece ao rodar `npm run dev` localmente (`NEXT_PUBLIC_SITE_URL=http://localhost:3000`). O app (`lib/siteUrl.ts`) detecta isso automaticamente e **omite esses campos do payload** quando não há uma URL HTTPS válida configurada, em vez de quebrar a chamada. Na prática:
- **Local**: o Pix/Cartão são gerados normalmente, mas o webhook não é acionado (Mercado Pago não tem para onde notificar) — a reserva fica em `pendente` até você confirmar manualmente no Supabase, o que é esperado em teste.
- **Produção (Vercel)**: assim que `NEXT_PUBLIC_SITE_URL` estiver configurada como a URL pública HTTPS do seu domínio, tudo funciona automaticamente, incluindo a confirmação via webhook.

---

## 2.5 Geocodificação de endereços (gratuita)

O botão "Buscar coordenadas pelo endereço" no editor de cada imóvel usa a API pública do [Nominatim](https://nominatim.org) (OpenStreetMap) — gratuita, sem chave de API, mantendo a infra 100% free tier. Não é necessário configurar nada: basta o admin preencher o "Endereço completo" e clicar no botão para preencher latitude/longitude automaticamente.

---

## 2.6 E-mail de confirmação (Resend)

O Mercado Pago **não envia** nenhum e-mail com os detalhes da reserva para o hóspede — só o recibo genérico da própria conta MP dele, se tiver uma. Por isso, assim que o webhook confirma o pagamento, o app dispara um e-mail de confirmação (com imóvel, datas, endereço exato e regras da casa) via [Resend](https://resend.com).

1. Crie uma conta em [resend.com](https://resend.com) (plano gratuito: 3.000 e-mails/mês, 100/dia — mais do que suficiente para uma pousada pequena).
2. Em **API Keys**, crie uma chave e copie para a variável `RESEND_API_KEY`.
3. **Sem domínio próprio ainda?** Pode testar direto: sem configurar `EMAIL_FROM`, o app usa o remetente de teste `onboarding@resend.dev` do próprio Resend — funciona, mas tem mais chance de cair em spam.
4. **Com domínio próprio**: em **Domains**, adicione seu domínio e siga as instruções para criar os registros DNS (SPF/DKIM) apontados pelo Resend. Depois de verificado, defina `EMAIL_FROM="Sua Pousada <reservas@seudominio.com>"`.
5. Se `RESEND_API_KEY` não estiver configurada, o app simplesmente não envia o e-mail (não quebra a confirmação da reserva, que já acontece antes do envio).

---

## 3. Deploy na Vercel

1. Suba o código para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione todas as variáveis do `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS` (o(s) e-mail(s) que você cadastrou como usuário no Supabase — ver seção 1.4)
   - `MP_ACCESS_TOKEN`
   - `NEXT_PUBLIC_SITE_URL` (depois do primeiro deploy, atualize com a URL final da Vercel e faça um redeploy)
   - `RESEND_API_KEY` (e-mail de confirmação — ver seção 2.6)
   - `EMAIL_FROM` (opcional, ver seção 2.6)
4. Clique em **Deploy**.
5. Depois do primeiro deploy, volte no Mercado Pago (passo 2.2) e confirme que as URLs usam o domínio final da Vercel.

---

## 4. Testando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves
npm run dev
```

Acesse `http://localhost:3000` para o site e `http://localhost:3000/admin` para o painel.

---

## 5. Acessando o painel administrativo

1. Acesse `/admin`.
2. Entre com o e-mail e a senha que você criou no Supabase (seção 1.4).
3. Você terá acesso a:
   - **Visão geral**: faturamento confirmado, reservas confirmadas/pendentes, WhatsApp do hóspede e cancelamento de pendentes.
   - **Cupons**: criação e gestão de cupons de desconto.
   - **Cada imóvel**: upload de fotos, edição de preços/textos, bloqueio manual de datas, janela de disponibilidade.

Qualquer e-mail que não esteja em `ADMIN_EMAILS` é redirecionado de volta para a tela de login mesmo depois de autenticar corretamente — o acesso ao `/admin` é controlado pelo middleware (`lib/supabase/middleware.ts`) comparando o e-mail logado com a lista em `ADMIN_EMAILS`.

---

## 6. Fluxo de reserva (resumo técnico)

1. Hóspede escolhe as datas em `/imovel/[slug]` → `BookingWidget`. O preço é calculado por `lib/pricing.ts` (semana/fim de semana/feriado), a estadia mínima do imóvel (`minimo_noites`) é validada antes de liberar o avanço, e o calendário desabilita automaticamente tanto os bloqueios manuais/reservas existentes quanto as datas fora da **janela de disponibilidade** configurada (`janela_disponibilidade_meses` — 1/2/3 meses ou sem limite).
2. **Sem login**: o hóspede preenche nome completo, e-mail, WhatsApp e CPF direto no checkout (etapa "dados"). Nenhuma conta é criada, não há redirecionamento — o CPF é exigido pelo Mercado Pago para gerar o Pix.
3. Escolhe Pix ou Cartão → `POST /api/bookings` valida tudo no servidor (estadia mínima, janela de disponibilidade, formato de e-mail/telefone/CPF, e o cupom de desconto — se informado, contra o registro mais atual em `coupons`), recalcula o preço a partir das tarifas cadastradas (nunca confia no valor do client), cria a reserva com status `pendente` (o banco impede overbooking via trigger) e gera o pagamento no Mercado Pago já com o desconto aplicado.
4. Mercado Pago notifica `POST /api/mercadopago/webhook` quando o status do pagamento muda (apenas quando há uma URL pública HTTPS configurada — ver seção 2.4).
5. O webhook consulta o pagamento **diretamente na API do Mercado Pago** (não confia no payload recebido) e só então marca a reserva como `confirmada`. Se um cupom foi aplicado, ele é consumido automaticamente neste momento (nunca antes, para não "queimar" cupons de reservas abandonadas).
6. Com a reserva confirmada, o webhook dispara o e-mail de confirmação (`lib/email.ts`, via Resend) com os detalhes da estadia — incluindo o endereço exato, que só é revelado neste momento (a página pública mostra apenas o mapa).

> O login (agora por e-mail/senha, sem OAuth) é usado **apenas** para você acessar o `/admin` — não faz parte do fluxo de reserva do hóspede.

---

## 7. Limites do free tier a ficar de olho

- **Supabase Free**: 500 MB de banco, 1 GB de Storage, projeto pausado após 7 dias sem uso (basta reativar no painel).
- **Vercel Hobby**: uso pessoal/não comercial nos termos da Vercel — para um negócio real de temporada, considere o plano Pro no futuro.
- **Mercado Pago**: sem custo de integração; taxas normais por transação aprovada.
