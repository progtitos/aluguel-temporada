-- =========================================================
-- MIGRATION 07: CPF do hóspede (exigido pelo Mercado Pago para
-- identificação do pagador no Pix).
-- Rode este arquivo no SQL Editor do Supabase DEPOIS de 01 a 06.
-- =========================================================

alter table profiles add column if not exists cpf text;
alter table bookings add column if not exists guest_cpf text;

-- Formato básico: 11 dígitos numéricos (validação completa fica no backend/app).
alter table profiles
  add constraint profiles_cpf_format
  check (cpf is null or cpf ~ '^[0-9]{11}$');
