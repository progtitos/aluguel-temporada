-- =====================================================================
-- MIGRAÇÃO 2 — Compra rápida pela Sacola (skip do formulário /checkout)
-- Execute DEPOIS de migration_checkout_pro.sql. Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Esses campos deixam de ser obrigatórios porque, na "compra rápida"
--    (botão "Finalizar Compra" da sacola lateral), o pedido é criado
--    ANTES de sabermos o nome/e-mail do cliente ou o endereço de entrega
--    — essas informações só chegam depois, quando o Mercado Pago as
--    coleta durante o próprio Checkout Pro (payer + shipments com
--    mode: 'not_specified') e o webhook atualiza o pedido.
-- ---------------------------------------------------------------------
alter table public.orders alter column customer_name drop not null;
alter table public.orders alter column customer_email drop not null;
alter table public.orders alter column shipping_address drop not null;

-- ---------------------------------------------------------------------
-- 2. Identifica a origem do pedido: veio do formulário completo de
--    checkout (com frete calculado) ou da compra rápida pela sacola
--    (sem frete calculado, endereço pendente de confirmação)?
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists order_source text not null default 'checkout_form'
    check (order_source in ('checkout_form', 'quick_buy'));

comment on column public.orders.order_source is
  'checkout_form: passou pela página /checkout com frete calculado. ' ||
  'quick_buy: veio direto da sacola lateral — endereço/frete não foram ' ||
  'calculados antecipadamente e dependem do que o Mercado Pago coletar.';

-- =====================================================================
-- ATENÇÃO — LIMITAÇÃO IMPORTANTE DO FLUXO "QUICK BUY"
-- =====================================================================
-- O objeto `shipments: { mode: 'not_specified' }` faz o Mercado Pago pedir
-- o endereço de entrega dentro do próprio Checkout Pro, mas a API de
-- Payments só devolve de volta um endereço PARCIAL (bairro/cidade/estado,
-- sem rua/número/CEP) em `additional_info.shipments.receiver_address`.
-- O endereço completo fica associado ao recurso de Shipment do Mercado
-- Envios, que exige integração adicional (Mercado Envios / API de Envios)
-- não coberta aqui.
--
-- Ou seja: pedidos com order_source = 'quick_buy' vão chegar no admin com
-- pagamento confirmado, mas SEM endereço de entrega completo. O time
-- precisa entrar em contato com o cliente (o e-mail do pagador é
-- capturado) para confirmar o endereço antes de despachar, ou avaliar
-- contratar a integração de Mercado Envios para automatizar isso.
-- =====================================================================
