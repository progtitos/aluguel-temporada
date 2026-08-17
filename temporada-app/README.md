# Temporada App

Site + painel administrativo para aluguel por temporada de 3 acomodações, com login social (Google/Apple) e pagamento via Mercado Pago (Pix e Cartão).

- **`SETUP.md`** → passo a passo completo de configuração (Supabase, Google, Apple, Mercado Pago, Vercel). **Comece por aqui.**
- **`supabase/`** → scripts SQL (schema, RLS, storage, seed).
- **`app/`** → páginas e rotas de API do Next.js.
- **`components/`** → componentes de UI.
- **`.env.example`** → variáveis de ambiente necessárias.

## Estrutura

```
app/
  page.tsx                       Home (lista os 3 imóveis)
  imovel/[slug]/page.tsx         Página do imóvel (estilo Airbnb)
  admin/
    login/page.tsx               Login do painel
    (dashboard)/
      layout.tsx                 Sidebar + proteção
      page.tsx                   Faturamento e relatórios
      imoveis/[id]/page.tsx      Edição de um imóvel
  api/
    bookings/route.ts            Cria reserva + pagamento
    mercadopago/webhook/route.ts Confirma reserva após pagamento
    admin/...                    CRUD do painel (fotos, preços, bloqueios)
  auth/callback/route.ts         Callback do login social
components/                      PropertyCard, Carousel, BookingWidget, etc.
lib/                             Supabase clients, Mercado Pago, utils
supabase/                        SQL: schema, RLS, storage, seed
```

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves (ver SETUP.md)
npm run dev
```
