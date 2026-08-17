-- =========================================================
-- SCHEMA: properties, bookings, payments
-- Rode este arquivo no SQL Editor do Supabase
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------- properties ----------
create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  short_description text,
  description text,
  house_rules text,
  address_approx text,
  latitude double precision,
  longitude double precision,
  price_per_night numeric(10,2) not null default 0,
  cleaning_fee numeric(10,2) not null default 0,
  max_guests int not null default 2,
  photos text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- bookings ----------
-- status: pendente | confirmada | cancelada | bloqueio
-- "bloqueio" = data bloqueada manualmente pelo admin (sem hóspede)
create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  guest_name text,
  guest_email text,
  check_in date not null,
  check_out date not null,
  total_amount numeric(10,2) not null default 0,
  status text not null default 'pendente'
    check (status in ('pendente','confirmada','cancelada','bloqueio')),
  created_at timestamptz not null default now(),
  constraint check_out_after_check_in check (check_out > check_in)
);

create index if not exists idx_bookings_property on bookings(property_id);
create index if not exists idx_bookings_dates on bookings(property_id, check_in, check_out);

-- ---------- payments ----------
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
  mp_payment_id text,
  mp_preference_id text,
  method text, -- 'pix' | 'credit_card'
  status text not null default 'pending',
  amount numeric(10,2) not null default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_booking on payments(booking_id);
create index if not exists idx_payments_mp_id on payments(mp_payment_id);

-- ---------- trigger: impede overbooking em reservas confirmadas/bloqueios ----------
create or replace function prevent_overlapping_bookings()
returns trigger as $$
begin
  if new.status in ('confirmada','bloqueio','pendente') then
    if exists (
      select 1 from bookings
      where property_id = new.property_id
        and id <> coalesce(new.id, uuid_nil())
        and status in ('confirmada','bloqueio','pendente')
        and daterange(check_in, check_out) && daterange(new.check_in, new.check_out)
    ) then
      raise exception 'Já existe uma reserva/bloqueio para este período.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_overlap on bookings;
create trigger trg_prevent_overlap
  before insert or update on bookings
  for each row execute function prevent_overlapping_bookings();
