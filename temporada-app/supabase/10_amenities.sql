-- =========================================================
-- MIGRATION 10: comodidades do imóvel (amenities)
-- Rode este arquivo no SQL Editor do Supabase DEPOIS de 01 a 09.
-- =========================================================

alter table properties
  add column if not exists amenities text[] not null default '{}';

-- Lista de chaves válidas fica no código (lib/amenities.ts), não aqui —
-- assim dá para adicionar uma nova comodidade sem precisar de migration.

-- Preenche comodidades de exemplo nas 3 acomodações do seed (04_seed.sql).
-- Não faz nada se você já tiver excluído/renomeado esses imóveis.
update properties set amenities = '{wifi,pool,parking,bbq}' where slug = 'casa-da-praia';
update properties set amenities = '{wifi,ac,kitchen,tv}' where slug = 'chale-da-montanha';
update properties set amenities = '{wifi,ac,kitchen,tv,washer}' where slug = 'loft-centro';
