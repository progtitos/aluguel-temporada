-- =====================================================================
-- MIGRAÇÃO — Alinhamento com Checkout Pro (Mercado Pago)
-- Execute este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.
-- É seguro rodar mais de uma vez (idempotente).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. payment_method deixa de ser um enum fixo ('pix' | 'credit_card').
--    Agora ele é preenchido pelo WEBHOOK com o payment_type_id que o
--    Mercado Pago retorna (ex: 'credit_card', 'debit_card', 'pix',
--    'ticket', 'bank_transfer', 'account_money'), porque no Checkout Pro
--    o método real só é conhecido depois que o cliente escolhe dentro da
--    página do Mercado Pago — antes disso, o valor fica null.
-- ---------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_payment_method_check;

-- ---------------------------------------------------------------------
-- 2. Nova coluna para guardar o status_detail do Mercado Pago
--    (ex: 'cc_rejected_insufficient_amount', 'pending_waiting_payment'),
--    útil para o admin entender POR QUE um pagamento foi recusado sem
--    precisar abrir o painel do Mercado Pago.
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists mercadopago_status_detail text;

-- ---------------------------------------------------------------------
-- 3. Índice para buscar rapidamente um pedido pela preference_id
--    (útil ao depurar problemas de checkout).
-- ---------------------------------------------------------------------
create index if not exists idx_orders_mp_preference
  on public.orders(mercadopago_preference_id);

-- =====================================================================
-- NOTA SOBRE RLS (Row Level Security)
-- =====================================================================
-- Nenhuma policy nova é necessária para o checkout funcionar. A criação de
-- pedidos (`orders`/`order_items`) acontece inteiramente dentro da API
-- Route `/api/checkout`, usando `createAdminClient()` — que usa a
-- SUPABASE_SERVICE_ROLE_KEY e portanto IGNORA o RLS por completo. O client
-- anônimo do navegador nunca insere pedidos diretamente.
--
-- Se no futuro vocês decidirem inserir pedidos diretamente do client
-- (sem passar pela API Route), aí sim seria necessária uma policy do tipo:
--
--   create policy "public_insert_orders" on public.orders
--     for insert with check (true);
--
-- Mas isso NÃO é recomendado: o client poderia enviar preços e totais
-- arbitrários, e a API Route é o que garante que os valores vêm sempre do
-- banco (tabela `products`), não do que o navegador envia.
-- =====================================================================
