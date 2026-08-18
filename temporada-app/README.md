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
  page.tsx                             Home (lista os imóveis)
  imovel/[slug]/page.tsx               Página do imóvel (estilo Airbnb)
  admin/
    login/page.tsx                     Login do painel
    (dashboard)/
      layout.tsx                       Sidebar + proteção + contexto de imóveis
      page.tsx                         Faturamento, relatórios e cancelamento de pendentes
      imoveis/[id]/page.tsx            Edição de um imóvel
  api/
    bookings/route.ts                  Recalcula preço no servidor + cria reserva + pagamento
    profile/route.ts                   Nome, WhatsApp e CPF do hóspede
    mercadopago/webhook/route.ts       Confirma reserva após pagamento
    admin/
      properties/[id]/route.ts         Edita dados do imóvel (inclui slug e ordem de fotos)
      properties/[id]/photos/route.ts  Upload múltiplo + remoção de fotos
      bookings/route.ts                Bloqueio manual de datas
      bookings/[id]/route.ts           Remove bloqueio/pendente (nunca confirmada)
      pricing-rules/...                CRUD de regras de feriado/pacote
      geocode/route.ts                 Geocodifica endereço → lat/lng (Nominatim)
  auth/callback/route.ts               Callback do login social (respeita ?next=)
components/
  PropertyCard.tsx, Carousel.tsx, PhotoLightbox.tsx, PropertyMap.tsx
  BookingWidget.tsx                    Datas → login → perfil (nome/whats/CPF) → pagamento
  AdminPropertyEditor.tsx              Fotos (drag-and-drop), tarifas, feriados, slug, mapa
  AdminBookingsTable.tsx               Tabela com WhatsApp e cancelamento de pendentes
  AdminPropertiesProvider.tsx          Sincroniza nome do imóvel (editor ↔ sidebar) em tempo real
lib/
  pricing.ts                           Fonte única de verdade do preço (semana/fds/feriado/mínimo)
  mercadopago.ts                       Integração Pix + Cartão (payload completo do payer)
  phoneMask.ts, cpfMask.ts, slug.ts, geocoding.ts, dateLocale.ts
  supabase/                            Clientes browser/server/admin + middleware
supabase/                              SQL: schema, RLS, storage, seed, migrations 05-07
```

## Migrations (rodar em ordem no SQL Editor do Supabase)

`01_schema.sql` → `02_rls_policies.sql` → `03_storage.sql` → `04_seed.sql` (opcional) →
`05_pricing_checkin_and_profiles.sql` → `06_minimo_noites.sql` → `07_guest_cpf.sql`

Detalhes de cada uma no `SETUP.md`.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves (ver SETUP.md)
npm run dev
```
