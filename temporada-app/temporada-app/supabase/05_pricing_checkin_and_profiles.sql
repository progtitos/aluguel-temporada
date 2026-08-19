-- =========================================================
-- MIGRATION 05: precificação dinâmica, feriados, perfil do
-- hóspede, telefone e horários de check-in/check-out.
-- Rode este arquivo no SQL Editor do Supabase DEPOIS dos
-- arquivos 01 a 04.
-- =========================================================

-- ---------- properties: novos campos ----------
alter table properties
  add column if not exists preco_semana numeric(10,2),
  add column if not exists preco_fds numeric(10,2),
  add column if not exists address_full text,
  add column if not exists checkin_time text not null default '15:00',
  add column if not exists checkout_time text not null default '11:00';

-- Backfill: quem já tinha price_per_night preenchido recebe o mesmo valor
-- em ambas as novas colunas como ponto de partida (edite depois pelo /admin).
update properties
  set preco_semana = coalesce(preco_semana, price_per_night),
      preco_fds = coalesce(preco_fds, price_per_night)
  where price_per_night is not null;

alter table properties
  alter column preco_semana set not null,
  alter column preco_fds set not null;

alter table properties drop column if exists price_per_night;

-- ---------- pricing_rules: pacotes/feriados com preço próprio ----------
create table if not exists pricing_rules (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  price_per_night numeric(10,2) not null,
  min_nights int not null default 1,
  created_at timestamptz not null default now(),
  constraint pricing_rules_end_after_start check (end_date >= start_date)
);

create index if not exists idx_pricing_rules_property on pricing_rules(property_id, start_date, end_date);

alter table pricing_rules enable row level security;

-- Leitura pública: necessária para calcular/exibir o preço no site antes
-- de qualquer login. Escritas continuam restritas ao backend (service_role).
drop policy if exists "pricing_rules_public_read" on pricing_rules;
create policy "pricing_rules_public_read"
  on pricing_rules for select
  using (true);

-- ---------- bookings: telefone do hóspede ----------
alter table bookings add column if not exists guest_phone text;

-- ---------- profiles: dados do hóspede (nome completo + whatsapp) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_owner_select" on profiles;
create policy "profiles_owner_select"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_owner_insert" on profiles;
create policy "profiles_owner_insert"
  on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_owner_update" on profiles;
create policy "profiles_owner_update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
