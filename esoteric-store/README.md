# Universo Encantado — Loja Esotérica

Loja virtual esotérica completa (cristais, tarôs, incensos, velas, ervas e amuletos),
construída com **Next.js 14 (App Router) + TypeScript**, **Tailwind CSS**, **Supabase**
(Postgres, Auth e Storage) e **Mercado Pago** (Pix e Cartão de Crédito).

---

## ✨ Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Zustand (carrinho)
- **Backend:** Supabase (PostgreSQL + RLS, Auth, Storage)
- **Pagamentos:** Mercado Pago (Pix com QR Code dinâmico + Checkout Pro para cartão)
- **Frete:** Melhor Envio (Correios/transportadoras) com fallback de simulação local
- **Deploy:** Vercel

---

## 📁 Estrutura do projeto

```
esoteric-store/
├── supabase/
│   └── schema.sql              # Schema completo: tabelas, RLS, storage, seed
├── public/
│   └── images/
│       ├── logo-emblem.png     # Emblema circular (header/footer/hero)
│       └── logo-full.png       # Logomarca completa original
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home (catálogo completo + seções)
│   │   ├── produtos/                   # Catálogo + página de produto
│   │   ├── categorias/[slug]/          # Listagem por categoria
│   │   ├── checkout/                   # Checkout + página de sucesso
│   │   ├── admin/
│   │   │   ├── login/                  # Login (Supabase Auth)
│   │   │   ├── esqueci-senha/          # Solicitação de recuperação de senha
│   │   │   ├── redefinir-senha/        # Definição de nova senha (link do e-mail)
│   │   │   └── (dashboard)/            # Painel protegido: produtos, categorias, cupons, pedidos
│   │   └── api/
│   │       ├── checkout/               # Cria pedido + cobrança Mercado Pago
│   │       ├── frete/                  # Cálculo de frete por CEP
│   │       ├── cupom/validar/          # Validação de cupom em tempo real
│   │       ├── upload/                 # Upload de imagens (Supabase Storage)
│   │       └── webhook/mercadopago/    # Notificações de pagamento
│   ├── components/                     # Componentes de loja e admin
│   ├── lib/
│   │   ├── products.ts                 # Consultas de "mais vendidos" e "promoções"
│   │   └── supabase/                   # Clients + middleware de sessão
│   ├── store/                          # Carrinho (Zustand)
│   └── types/                          # Tipos TypeScript compartilhados
├── .env.example
└── vercel.json
```

---

## 🚀 Passo a passo — Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`.
   Isso cria as tabelas, políticas de RLS, o bucket de Storage `product-images`
   e algumas categorias de exemplo.
3. Em **Authentication > Providers > Email**, confirme que "Confirm email"
   está de acordo com o que você deseja. Se estiver habilitado, um usuário
   criado manualmente só consegue logar depois de confirmar o e-mail (ou você
   pode marcar "Auto Confirm User" ao criá-lo).
4. Em **Authentication > Users**, crie manualmente o usuário administrador
   (e-mail e senha) que terá acesso ao painel `/admin`. Não há cadastro público
   de administradores por segurança — a criação é sempre manual pelo painel do
   Supabase ou via convite.
5. Copie as chaves em **Project Settings > API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secreta) → `SUPABASE_SERVICE_ROLE_KEY`
6. Em **Authentication > URL Configuration**, adicione a URL do site (local e
   de produção) em "Site URL" e em "Redirect URLs" — isso é necessário para o
   link de recuperação de senha do admin funcionar corretamente
   (ex: `http://localhost:3000/**` e `https://SEU-DOMINIO.vercel.app/**`).

### 3. Configurar o Mercado Pago

1. Crie uma aplicação em [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel/app).
2. Copie o **Access Token** (uso interno/servidor) e a **Public Key**.
3. Em produção, configure a notificação (webhook) apontando para:
   `https://SEU-DOMINIO.vercel.app/api/webhook/mercadopago`
   (Painel do Mercado Pago > Sua aplicação > Webhooks > `payment`).

### 4. (Opcional) Configurar frete real com Melhor Envio

Sem essa configuração, o sistema usa uma simulação de frete baseada em região de
CEP e peso, permitindo testar a loja sem credenciais externas.

Para usar cálculo real:
1. Crie uma conta em [melhorenvio.com.br](https://melhorenvio.com.br).
2. Gere um token de API (Sandbox para testes, Produção para o site no ar).
3. Preencha `MELHOR_ENVIO_TOKEN` e `LOJA_CEP_ORIGEM` no `.env.local`.

### 5. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha todos os valores conforme os passos acima.

### 6. Rodar localmente

```bash
npm run dev
```

- Loja: [http://localhost:3000](http://localhost:3000)
- Painel admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Esqueci a senha: [http://localhost:3000/admin/esqueci-senha](http://localhost:3000/admin/esqueci-senha)

---

## ☁️ Deploy na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. A Vercel detecta automaticamente o framework Next.js.
4. Em **Environment Variables**, adicione todas as variáveis do `.env.example`
   com os valores de produção (use as credenciais de **produção** do Mercado
   Pago, não as de teste).
5. Defina `NEXT_PUBLIC_SITE_URL` com a URL final do projeto (ex:
   `https://universo-encantado.vercel.app` ou seu domínio próprio).
6. Clique em **Deploy**.
7. Após o primeiro deploy, atualize a URL do webhook no painel do Mercado Pago
   e as "Redirect URLs" no Supabase Auth para apontar para o domínio de produção.

---

## 🔑 Login administrativo — solução de problemas

Se o login em `/admin/login` falhar mesmo com e-mail e senha corretos, verifique:

1. **Usuário existe e está confirmado?** Em Supabase > Authentication > Users,
   confira se o usuário aparece com status confirmado. Se não, clique nele e
   confirme manualmente, ou reenvie o convite.
2. **Variáveis de ambiente corretas na Vercel?** `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` precisam ser exatamente as do seu projeto
   Supabase (não as de outro projeto/ambiente).
3. **Redirect URLs configuradas?** Necessário para o fluxo de "Esqueci minha
   senha" — sem isso, o Supabase recusa o redirecionamento do link de e-mail.
4. **Erro exibido na tela:** a tela de login agora mostra a razão real do erro
   (credenciais inválidas, e-mail não confirmado, limite de tentativas etc.),
   o que facilita identificar a causa.

---

## 🔐 Segurança e RLS

- Tabelas `products` e `categories`: leitura pública apenas para registros
  `is_active = true`; escrita restrita a usuários autenticados (admin).
- Tabela `orders`: criação feita exclusivamente pela API Route de checkout
  (usando a `service_role` key no servidor), nunca diretamente pelo client.
  Leitura e atualização restritas a administradores autenticados.
- Bucket `product-images`: leitura pública, upload/edição/exclusão restritos
  a administradores autenticados.
- A rota `/admin` inteira é protegida pelo `middleware.ts`, que redireciona
  usuários não autenticados para `/admin/login`. As rotas de login e
  recuperação de senha (`/admin/login`, `/admin/esqueci-senha`,
  `/admin/redefinir-senha`) permanecem públicas de propósito.

---

## 🏠 Página inicial

A home exibe, nesta ordem:

1. **Hero** com a logomarca e chamada principal.
2. **Categorias** — grade com todas as categorias ativas.
3. **Mais Vendidos** — calculado a partir dos itens de pedidos com pagamento
   aprovado (`order_items` + `orders.payment_status = 'paid'`), somando as
   quantidades vendidas por produto. Enquanto a loja não tem vendas, essa
   seção usa os produtos marcados como "Destaque" como substituto.
4. **Promoções** — produtos com um "preço de" (`compare_at_price`) maior que
   o preço atual, calculado e exibido com o percentual de desconto.
5. **Destaques** — produtos marcados manualmente como destaque no admin.
6. **Todos os Produtos** — catálogo completo (até 24 itens) já na própria
   home, com link "Ver catálogo completo" para `/produtos`.

A lógica de "mais vendidos" e "promoções" está centralizada em
`src/lib/products.ts` e pode ser ajustada conforme a necessidade (ex: mudar o
período considerado, o limite de itens, etc.).

---

## 🎨 Identidade visual

- **Paleta:** fundo claro em tom marfim (`ivory`), tinta quase-preta (`ink`),
  **dourado** (`dourado`) como cor de destaque principal, **verde-sálvia**
  (`esmeralda`) como acento secundário e **preto profundo** (`noite`) usado no
  header, footer e hero — todos fiéis à logomarca oficial do Universo Encantado.
- **Tipografia:** serifada elegante (Cormorant Garamond) para títulos e
  sans-serif limpa (Manrope) para o corpo do texto.
- **Logomarca:** a arte original fica em `public/images/logo-full.png`; uma
  versão recortada apenas do emblema circular (`logo-emblem.png`) é usada em
  contextos compactos como o cabeçalho e o rodapé.

Todos os tokens de cor e tipografia estão centralizados em `tailwind.config.ts`
e podem ser ajustados livremente.

---

## 🧩 Próximos passos sugeridos

- Envio de e-mails transacionais (confirmação de pedido, atualização de envio)
  via um serviço como Resend ou SendGrid.
- Emissão de nota fiscal integrada (ex: NFE.io, Focus NFe).
- Paginação no catálogo de produtos para lojas com grande volume de itens.
- Testes automatizados (Playwright/Vitest) para os fluxos de checkout e login.
