-- =========================================================
-- MIGRATION 09: cupons de desconto
-- Rode este arquivo no SQL Editor do Supabase DEPOIS de 01 a 08.
-- =========================================================

create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  type text not null check (type in ('fixed', 'percentage')),
  value numeric(10,2) not null check (value > 0),
  is_active boolean not null default true,
  usage_limit int not null default 1 check (usage_limit >= 1),
  used_count int not null default 0 check (used_count >= 0),
  valid_until timestamptz,
  min_nights int,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on coupons (upper(code));

-- Sempre grava/consulta o código em maiúsculas, para "verao10" e "VERAO10"
-- serem tratados como o mesmo cupom.
create or replace function normalize_coupon_code()
returns trigger as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_normalize_coupon_code on coupons;
create trigger trg_normalize_coupon_code
  before insert or update on coupons
  for each row execute function normalize_coupon_code();

-- ---------- bookings: registro do cupom aplicado (se houver) ----------
alter table bookings add column if not exists coupon_code text;
alter table bookings add column if not exists discount_amount numeric(10,2) not null default 0;

-- ---------- RLS ----------
alter table coupons enable row level security;

-- Leitura pública necessária para o hóspede conseguir validar/aplicar um
-- cupom no checkout antes de qualquer autenticação. Escritas (criar,
-- editar, excluir) continuam restritas ao backend (service_role, usado
-- pelas rotas /api/admin/coupons/*).
drop policy if exists "coupons_public_read" on coupons;
create policy "coupons_public_read"
  on coupons for select
  using (true);

-- ---------- Regra de negócio: uso único por reserva CONFIRMADA ----------
-- Consome o cupom automaticamente e de forma atômica no exato momento em
-- que uma reserva passa a "confirmada" — nunca em "pendente" (que pode
-- expirar/ser abandonada sem pagamento). Funciona independentemente de
-- qual código dispara a confirmação (hoje só o webhook do Mercado Pago,
-- mas a regra fica garantida no banco, não apenas na aplicação).
create or replace function consume_coupon_on_booking_confirmation()
returns trigger as $$
begin
  if new.status = 'confirmada'
     and (old.status is distinct from 'confirmada')
     and new.coupon_code is not null then
    update coupons
      set used_count = used_count + 1,
          is_active = case
            when used_count + 1 >= usage_limit then false
            else is_active
          end
      where code = new.coupon_code;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_consume_coupon_on_confirmation on bookings;
create trigger trg_consume_coupon_on_confirmation
  after update on bookings
  for each row execute function consume_coupon_on_booking_confirmation();
