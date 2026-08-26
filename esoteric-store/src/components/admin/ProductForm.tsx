'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import { buildCategoryTree } from '@/lib/categories';
import type { Category, Product } from '@/types';

const RLS_SILENT_FAILURE_MESSAGE =
  'A operação não teve efeito no banco de dados. Isso normalmente indica que as ' +
  'políticas de RLS (Row Level Security) da tabela "products" não estão aplicadas ou ' +
  'que sua sessão de admin expirou. Rode novamente o schema.sql no SQL Editor do ' +
  'Supabase e faça login de novo no painel.';

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const router = useRouter();
  const isEditing = !!product;

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    category_id: product?.category_id ?? categories[0]?.id ?? '',
    short_description: product?.short_description ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    compare_at_price: product?.compare_at_price?.toString() ?? '',
    sku: product?.sku ?? '',
    stock: product?.stock?.toString() ?? '0',
    weight_grams: product?.weight_grams?.toString() ?? '200',
    height_cm: product?.height_cm?.toString() ?? '10',
    width_cm: product?.width_cm?.toString() ?? '10',
    length_cm: product?.length_cm?.toString() ?? '10',
    is_featured: product?.is_featured ?? false,
    is_active: product?.is_active ?? true,
  });

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryTree = buildCategoryTree(categories);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setImages((prev) => [...prev, data.url]);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      category_id: form.category_id || null,
      short_description: form.short_description || null,
      description: form.description || null,
      price: Number(form.price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      sku: form.sku || null,
      stock: Number(form.stock),
      weight_grams: Number(form.weight_grams),
      height_cm: Number(form.height_cm),
      width_cm: Number(form.width_cm),
      length_cm: Number(form.length_cm),
      images,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };

    const query = isEditing
      ? supabase.from('products').update(payload).eq('id', product!.id).select()
      : supabase.from('products').insert(payload).select();

    const { data, error } = await query;

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.length) {
      // Nenhuma linha afetada, mas também nenhum erro: sinal clássico de uma
      // policy de RLS bloqueando a operação silenciosamente. Nunca dizemos
      // "sucesso" nesse caso, senão o produto some sem explicação nenhuma.
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }

    toast.success(isEditing ? 'Produto atualizado!' : 'Produto criado!');
    router.push('/admin/produtos');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <section className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-500">Nome do produto</label>
          <input required className="input-store" value={form.name}
            onChange={(e) => updateField('name', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Slug (URL)</label>
          <input className="input-store" placeholder="gerado automaticamente" value={form.slug}
            onChange={(e) => updateField('slug', slugify(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Categoria</label>
          <select className="input-store" value={form.category_id}
            onChange={(e) => updateField('category_id', e.target.value)}>
            {categoryTree.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {'—'.repeat(cat.depth)}{cat.depth > 0 ? ' ' : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-500">Descrição curta</label>
          <input className="input-store" value={form.short_description}
            onChange={(e) => updateField('short_description', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-500">Descrição completa</label>
          <textarea rows={4} className="input-store" value={form.description}
            onChange={(e) => updateField('description', e.target.value)} />
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Preço (R$)</label>
          <input required type="number" step="0.01" min="0" className="input-store" value={form.price}
            onChange={(e) => updateField('price', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Preço "de" (opcional)</label>
          <input type="number" step="0.01" min="0" className="input-store" value={form.compare_at_price}
            onChange={(e) => updateField('compare_at_price', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Estoque</label>
          <input required type="number" min="0" className="input-store" value={form.stock}
            onChange={(e) => updateField('stock', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">SKU</label>
          <input className="input-store" value={form.sku}
            onChange={(e) => updateField('sku', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Peso (g)</label>
          <input type="number" min="0" className="input-store" value={form.weight_grams}
            onChange={(e) => updateField('weight_grams', e.target.value)} />
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Altura (cm)</label>
          <input type="number" min="0" className="input-store" value={form.height_cm}
            onChange={(e) => updateField('height_cm', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Largura (cm)</label>
          <input type="number" min="0" className="input-store" value={form.width_cm}
            onChange={(e) => updateField('width_cm', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Comprimento (cm)</label>
          <input type="number" min="0" className="input-store" value={form.length_cm}
            onChange={(e) => updateField('length_cm', e.target.value)} />
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <label className="mb-2 block text-xs font-medium text-ink-500">Fotos do produto</label>
        <div className="mb-3 flex flex-wrap gap-3">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-ink/10">
              <Image src={url} alt="Produto" fill className="object-cover" />
              <button type="button" onClick={() => removeImage(url)}
                className="absolute right-0.5 top-0.5 rounded-full bg-ink-700/80 p-0.5 text-white">
                <X size={12} />
              </button>
            </div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-ink/20 text-ink-300 hover:border-dourado-500 hover:text-dourado-700">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="text-[10px]">Adicionar</span>
            <input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
          </label>
        </div>
      </section>

      <section className="flex items-center gap-6 rounded-lg border border-ink/10 bg-white p-5">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={form.is_featured}
            onChange={(e) => updateField('is_featured', e.target.checked)} />
          Produto em destaque
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={form.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)} />
          Produto ativo (visível na loja)
        </label>
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={18} className="animate-spin" /> : isEditing ? 'Salvar alterações' : 'Criar produto'}
        </button>
        <button type="button" onClick={() => router.push('/admin/produtos')} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
