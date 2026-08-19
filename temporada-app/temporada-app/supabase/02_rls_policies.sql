-- =========================================================
-- ROW LEVEL SECURITY
-- Estratégia:
--  - Leitura pública de imóveis ativos.
--  - Calendário de disponibilidade exposto via VIEW pública (sem dados do hóspede).
--  - Tabela bookings: hóspede só enxerga as próprias reservas.
--  - Todas as ESCRITAS de admin (properties, bookings, payments) são feitas
--    pelas Route Handlers do Next.js usando a service_role key, que ignora
--    RLS. Por isso não criamos policies de INSERT/UPDATE amplas para "anon".
-- =========================================================

alter table properties enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;

-- ---------- properties ----------
drop policy if exists "properties_public_read" on properties;
create policy "properties_public_read"
  on properties for select
  using (is_active = true);

-- ---------- bookings ----------
-- Hóspede autenticado só vê as próprias reservas.
drop policy if exists "bookings_owner_read" on bookings;
create policy "bookings_owner_read"
  on bookings for select
  using (auth.uid() = guest_id);

-- Hóspede autenticado pode criar sua PRÓPRIA reserva como "pendente".
-- (A confirmação de status só ocorre via webhook, usando service_role.)
drop policy if exists "bookings_owner_insert" on bookings;
create policy "bookings_owner_insert"
  on bookings for insert
  with check (auth.uid() = guest_id and status = 'pendente');

-- ---------- payments ----------
-- Nenhuma policy de leitura pública: pagamentos só são lidos/escritos
-- pelo backend (service_role), que ignora RLS.

-- ---------- view pública de disponibilidade (sem PII do hóspede) ----------
create or replace view public_availability as
  select property_id, check_in, check_out, status
  from bookings
  where status in ('confirmada', 'bloqueio', 'pendente');

grant select on public_availability to anon, authenticated;
