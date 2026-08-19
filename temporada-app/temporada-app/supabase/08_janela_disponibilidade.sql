-- =========================================================
-- MIGRATION 08: janela de disponibilidade do calendário
-- Rode este arquivo no SQL Editor do Supabase DEPOIS de 01 a 07.
-- =========================================================

-- NULL = "Sem limite" (calendário aberto sem restrição de data futura).
-- 1, 2 ou 3 = quantidade de meses a partir de hoje em que o hóspede pode
-- reservar; datas além dessa janela ficam desabilitadas no calendário
-- público, em conjunto com (não substituindo) os bloqueios manuais.
alter table properties
  add column if not exists janela_disponibilidade_meses int;

alter table properties
  add constraint janela_disponibilidade_meses_valida
  check (janela_disponibilidade_meses is null or janela_disponibilidade_meses in (1, 2, 3));
