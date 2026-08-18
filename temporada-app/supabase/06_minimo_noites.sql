-- =========================================================
-- MIGRATION 06: mínimo de noites por imóvel
-- Rode este arquivo no SQL Editor do Supabase DEPOIS de 01 a 05.
-- =========================================================

alter table properties
  add column if not exists minimo_noites int not null default 1;

alter table properties
  add constraint minimo_noites_positivo check (minimo_noites >= 1);
