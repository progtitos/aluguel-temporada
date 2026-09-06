# Temporada App

Site + painel administrativo para aluguel por temporada de acomodações, com checkout direto do hóspede (sem login), cupons de desconto e pagamento via Mercado Pago (Pix e Cartão). O painel `/admin` é protegido por login com e-mail e senha (Supabase Auth) — sem login social.

- **`SETUP.md`** → passo a passo completo de configuração (Supabase, criação do usuário admin, Mercado Pago, Vercel). **Comece por aqui.**
- **`supabase/`** → scripts SQL (schema, RLS, storage, seed).
- **`app/`** → páginas e rotas de API do Next.js.
- **`components/`** → componentes de UI.
- **`.env.example`** → variáveis de ambiente necessárias.

## Estrutura

```
app/
  page.tsx                             Home (lista os imóveis, cards com foto grande)
  imovel/[slug]/page.tsx               Página do imóvel (galeria mosaico + comodidades)
  admin/
    login/page.tsx                     Login do painel (e-mail + senha via AdminLoginForm)
    (dashboard)/
      layout.tsx                       Sidebar + proteção + contexto de imóveis
      page.tsx                         KPIs, gráfico de faturamento, tabela com filtro
      calendario/page.tsx              Calendário de disponibilidade (todos os imóveis)
      cupons/page.tsx                  Gestão de cupons de desconto
      imoveis/[id]/page.tsx            Edição de um imóvel (abas)
  api/
    bookings/route.ts                  Checkout sem login: valida tudo, recalcula preço e cria o pagamento
    coupons/validate/route.ts          Valida cupom e calcula desconto (sem consumir)
    mercadopago/webhook/route.ts       Confirma reserva após pagamento
    admin/
      properties/[id]/route.ts         Edita dados do imóvel (slug, ordem de fotos, comodidades)
      properties/[id]/photos/route.ts  Upload múltiplo + remoção de fotos
      bookings/route.ts                Bloqueio manual de datas
      bookings/[id]/route.ts           Remove bloqueio/pendente (nunca confirmada)
      pricing-rules/...                CRUD de regras de feriado/pacote
      coupons/...                      CRUD de cupons
      geocode/route.ts                 Geocodifica endereço → lat/lng (Nominatim)
components/
  PropertyCard.tsx                     Card com foto grande, preço em badge, ícones de meta
  PropertyGallery.tsx                  Galeria mosaico (desktop) + Carousel (mobile)
  Carousel.tsx, PhotoLightbox.tsx, PropertyMap.tsx
  BookingWidget.tsx                    Datas → dados (com ícones) → pagamento — sem login
  AdminSidebar.tsx                     Sidebar com ícones (Visão geral, Calendário, Cupons, Imóveis)
  AdminPropertyEditor.tsx              Abas: Geral/Fotos/Preços/Localização/Calendário + prévia ao vivo
  AdminAvailabilityCalendar.tsx        Calendário mensal colorido por status, filtro por imóvel
  AdminRevenueChart.tsx                Gráfico de faturamento mensal
  AdminBookingsTable.tsx               Tabela com WhatsApp, filtro por imóvel e cancelamento de pendentes
  AdminCouponsManager.tsx              Criação e gestão de cupons
  AdminPropertiesProvider.tsx          Sincroniza nome do imóvel (editor ↔ sidebar) em tempo real
lib/
  pricing.ts                           Fonte única de verdade do preço (semana/fds/feriado/mínimo)
  coupons.ts                           Validação e cálculo de desconto de cupons
  amenities.ts                         Catálogo de comodidades (chave → label + ícone)
  availability.ts                      Janela de disponibilidade do calendário (1/2/3 meses ou sem limite)
  mercadopago.ts                       Integração Pix + Cartão (payload completo do payer)
  siteUrl.ts                           Só monta notification_url/back_urls com HTTPS válido
  phoneMask.ts, cpfMask.ts, slug.ts, geocoding.ts, dateLocale.ts
  supabase/                            Clientes browser/server/admin + middleware
supabase/                              SQL: schema, RLS, storage, seed, migrations 05-10
```

## Migrations (rodar em ordem no SQL Editor do Supabase)

`01_schema.sql` → `02_rls_policies.sql` → `03_storage.sql` → `04_seed.sql` (opcional) →
`05_pricing_checkin_and_profiles.sql` → `06_minimo_noites.sql` → `07_guest_cpf.sql` →
`08_janela_disponibilidade.sql` → `09_coupons.sql` → `10_amenities.sql`

Detalhes de cada uma no `SETUP.md`.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves (ver SETUP.md)
npm run dev
```
