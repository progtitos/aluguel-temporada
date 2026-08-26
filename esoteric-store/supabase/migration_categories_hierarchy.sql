-- =====================================================================
-- MIGRAÇÃO — Categorias hierárquicas (Acessórios > Pulseiras > Correntes)
-- Execute este arquivo no SQL Editor do Supabase DEPOIS do schema.sql
-- (e depois das outras migrações, se ainda não tiverem sido aplicadas).
-- É seguro rodar mais de uma vez (idempotente).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coluna parent_id: uma categoria pode ter uma categoria "pai".
--    on delete set null -> se a categoria pai for removida, a subcategoria
--    NÃO é apagada junto (nem bloqueia a exclusão da pai): ela só volta a
--    ser uma categoria de nível topo. Isso é o que o painel admin espera:
--    excluir uma categoria nunca deve travar por causa de uma FK.
-- ---------------------------------------------------------------------
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;

create index if not exists idx_categories_parent on public.categories(parent_id);

comment on column public.categories.parent_id is
  'Categoria pai, para suportar hierarquia (ex: Acessórios > Pulseiras > Correntes). Nulo = categoria de nível topo.';

-- ---------------------------------------------------------------------
-- 2. Trava de sanidade: uma categoria nunca pode ser pai de si mesma.
--    (Um ciclo mais profundo, ex. A->B->A, não é impedido por um CHECK
--    simples — é tratado na camada de aplicação/admin.)
-- ---------------------------------------------------------------------
alter table public.categories drop constraint if exists categories_parent_not_self;
alter table public.categories
  add constraint categories_parent_not_self check (parent_id is distinct from id);

-- ---------------------------------------------------------------------
-- 3. Categoria "Acessórios" (nova seção do menu principal) + exemplo de
--    subcategorias de 2 níveis, exatamente como pedido:
--    Acessórios > Pulseiras > Correntes
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, description, sort_order)
values ('Acessórios', 'acessorios', 'Bijuterias e acessórios energéticos: pulseiras, colares e correntes.', 7)
on conflict (slug) do nothing;

insert into public.categories (name, slug, description, sort_order, parent_id)
select 'Pulseiras', 'pulseiras', 'Pulseiras energéticas e de pedras naturais.', 1, c.id
from public.categories c
where c.slug = 'acessorios'
on conflict (slug) do nothing;

insert into public.categories (name, slug, description, sort_order, parent_id)
select 'Correntes', 'correntes', 'Correntes e colares para amuletos e pingentes.', 1, p.id
from public.categories p
where p.slug = 'pulseiras'
on conflict (slug) do nothing;

-- =====================================================================
-- NOTA — RLS não precisa mudar
-- =====================================================================
-- As policies "admin_all_categories" (schema.sql) já cobrem qualquer
-- coluna nova da tabela, incluindo parent_id: elas liberam ALL (select/
-- insert/update/delete) para qualquer usuário autenticado, sem checar
-- coluna por coluna. Se o CRUD de categorias ainda estiver falhando
-- depois desta migração, o problema não é RLS nem FK — normalmente é o
-- código do admin não estar checando se a operação realmente afetou
-- alguma linha (ver correção em CategoryManager.tsx).
-- =====================================================================
