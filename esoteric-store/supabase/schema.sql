-- =====================================================================
-- LOJA ESOTÉRICA — SCHEMA SUPABASE (PostgreSQL)
-- Execute este arquivo no SQL Editor do painel do Supabase.
-- =====================================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. TABELA: categories (categorias / seções da loja)
-- =====================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is 'Categorias/seções esotéricas: cristais, tarôs, incensos, velas, etc.';

-- =====================================================================
-- 2. TABELA: products (produtos)
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  sku text unique,
  stock integer not null default 0 check (stock >= 0),
  weight_grams integer not null default 200,
  height_cm numeric(6,2) not null default 10,
  width_cm numeric(6,2) not null default 10,
  length_cm numeric(6,2) not null default 10,
  images text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_active_featured on public.products(is_active, is_featured);

comment on table public.products is 'Catálogo de produtos da loja esotérica.';

-- =====================================================================
-- 3. TABELA: coupons (cupons de desconto)
-- =====================================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  min_order_value numeric(10,2) default 0,
  usage_limit integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.coupons is 'Cupons de desconto: percentual ou valor fixo, com limite de uso e validade.';

-- =====================================================================
-- 4. TABELA: orders (pedidos)
-- =====================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_document text,
  shipping_address jsonb not null,
  shipping_cost numeric(10,2) not null default 0,
  shipping_method text,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  payment_method text check (payment_method in ('pix', 'credit_card')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'rejected', 'refunded', 'cancelled')),
  fulfillment_status text not null default 'pending' check (fulfillment_status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  mercadopago_payment_id text,
  mercadopago_preference_id text,
  tracking_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_email on public.orders(customer_email);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_mp_payment on public.orders(mercadopago_payment_id);

comment on table public.orders is 'Pedidos realizados na loja, com status de pagamento e envio.';

-- =====================================================================
-- 5. TABELA: order_items (itens do pedido)
-- =====================================================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  total numeric(10,2) not null
);

create index if not exists idx_order_items_order on public.order_items(order_id);

-- =====================================================================
-- 6. TRIGGERS — updated_at automático
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 7. FUNÇÃO: validar e aplicar cupom
-- =====================================================================
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns table (
  valid boolean,
  message text,
  coupon_id uuid,
  discount_amount numeric
) as $$
declare
  v_coupon public.coupons%rowtype;
begin
  select * into v_coupon from public.coupons
    where upper(code) = upper(p_code)
    limit 1;

  if not found then
    return query select false, 'Cupom não encontrado.', null::uuid, 0::numeric;
    return;
  end if;

  if not v_coupon.is_active then
    return query select false, 'Cupom inativo.', null::uuid, 0::numeric;
    return;
  end if;

  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    return query select false, 'Cupom ainda não está válido.', null::uuid, 0::numeric;
    return;
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return query select false, 'Cupom expirado.', null::uuid, 0::numeric;
    return;
  end if;

  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    return query select false, 'Limite de uso do cupom atingido.', null::uuid, 0::numeric;
    return;
  end if;

  if p_subtotal < coalesce(v_coupon.min_order_value, 0) then
    return query select false,
      format('Pedido mínimo de R$ %s para este cupom.', v_coupon.min_order_value),
      null::uuid, 0::numeric;
    return;
  end if;

  if v_coupon.type = 'percentage' then
    return query select true, 'Cupom aplicado com sucesso.', v_coupon.id,
      round(p_subtotal * (v_coupon.value / 100), 2);
  else
    return query select true, 'Cupom aplicado com sucesso.', v_coupon.id,
      least(v_coupon.value, p_subtotal);
  end if;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Leitura pública (storefront) de categorias e produtos ativos
drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
  on public.categories for select
  using (is_active = true);

drop policy if exists "public_read_products" on public.products;
create policy "public_read_products"
  on public.products for select
  using (is_active = true);

-- Administradores autenticados têm acesso total (gestão via /admin)
drop policy if exists "admin_all_categories" on public.categories;
create policy "admin_all_categories"
  on public.categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_all_products" on public.products;
create policy "admin_all_products"
  on public.products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_all_coupons" on public.coupons;
create policy "admin_all_coupons"
  on public.coupons for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Pedidos: criação pública (checkout), leitura/gestão restrita a admins.
-- A criação de pedidos e validação de cupom é feita via API Route com
-- a Service Role Key (server-side), portanto client anon não insere direto.
drop policy if exists "admin_read_orders" on public.orders;
create policy "admin_read_orders"
  on public.orders for select
  using (auth.role() = 'authenticated');

drop policy if exists "admin_update_orders" on public.orders;
create policy "admin_update_orders"
  on public.orders for update
  using (auth.role() = 'authenticated');

drop policy if exists "admin_read_order_items" on public.order_items;
create policy "admin_read_order_items"
  on public.order_items for select
  using (auth.role() = 'authenticated');

-- =====================================================================
-- 9. STORAGE — bucket para fotos de produtos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "admin_upload_product_images" on storage.objects;
create policy "admin_upload_product_images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "admin_update_product_images" on storage.objects;
create policy "admin_update_product_images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "admin_delete_product_images" on storage.objects;
create policy "admin_delete_product_images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- =====================================================================
-- 10. DADOS INICIAIS (seed) — categorias esotéricas padrão
-- =====================================================================
insert into public.categories (name, slug, description, sort_order) values
  ('Cristais', 'cristais', 'Cristais e pedras naturais para cura, proteção e equilíbrio energético.', 1),
  ('Tarôs & Oráculos', 'taros-e-oraculos', 'Baralhos de tarô, oráculos e materiais para leitura.', 2),
  ('Incensos', 'incensos', 'Incensos naturais, resinas e defumadores.', 3),
  ('Velas', 'velas', 'Velas ritualísticas e aromáticas para intenções e rituais.', 4),
  ('Ervas & Banhos', 'ervas-e-banhos', 'Ervas secas, banhos de ervas e defumações.', 5),
  ('Amuletos & Talismãs', 'amuletos-e-talismas', 'Símbolos de proteção e atração energética.', 6)
on conflict (slug) do nothing;

-- =====================================================================
-- FIM DO SCHEMA
-- =====================================================================
