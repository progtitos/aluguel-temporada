-- =========================================================
-- STORAGE: bucket público "property-photos"
-- =========================================================

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

-- Leitura pública das fotos
drop policy if exists "property_photos_public_read" on storage.objects;
create policy "property_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'property-photos');

-- Upload/edição feitos pelo painel /admin usam a service_role key no
-- servidor (Route Handler), então ignoram estas policies. Caso prefira
-- fazer upload direto do browser autenticado como admin, descomente:
--
-- drop policy if exists "property_photos_admin_write" on storage.objects;
-- create policy "property_photos_admin_write"
--   on storage.objects for insert
--   with check (bucket_id = 'property-photos' and auth.role() = 'authenticated');
