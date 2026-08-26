'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, Loader2, Check, X, CornerDownRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import { buildCategoryTree, getDescendantIds } from '@/lib/categories';
import type { Category } from '@/types';

// Mensagem mostrada quando o Supabase não retorna erro algum, mas também
// não retorna nenhuma linha afetada. Isso acontece quando uma política de
// RLS bloqueia silenciosamente a operação (comportamento padrão do
// PostgREST/Supabase: UPDATE/DELETE que não casam nenhuma linha permitida
// pela policy "têm sucesso" com 0 linhas, sem lançar erro). Sem checar o
// retorno de .select() explicitamente, a UI mostra "sucesso" mesmo quando
// nada mudou no banco — foi exatamente esse o bug relatado no painel.
const RLS_SILENT_FAILURE_MESSAGE =
  'A operação não teve efeito no banco de dados. Isso normalmente indica que as ' +
  'políticas de RLS (Row Level Security) da tabela "categories" não estão aplicadas ' +
  'ou que sua sessão de admin expirou. Rode novamente o schema.sql no SQL Editor do ' +
  'Supabase e faça login de novo no painel.';

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');

  const tree = buildCategoryTree(categories);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        slug: slugify(name),
        description: description.trim() || null,
        parent_id: parentId || null,
        sort_order: categories.length + 1,
      })
      .select();
    setSaving(false);

    if (error) {
      toast.error(error.code === '23505' ? 'Já existe uma categoria com esse nome/slug.' : error.message);
      return;
    }
    if (!data?.length) {
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }

    setName('');
    setDescription('');
    setParentId('');
    toast.success(parentId ? 'Subcategoria criada!' : 'Categoria criada!');
    router.refresh();
  }

  async function toggleActive(cat: Category) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)
      .select();

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.length) {
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }
    router.refresh();
  }

  async function saveRename(cat: Category) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: editName,
        slug: slugify(editName),
        parent_id: editParentId || null,
      })
      .eq('id', cat.id)
      .select();
    setEditingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.length) {
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }
    toast.success('Categoria atualizada!');
    router.refresh();
  }

  async function handleDelete(cat: Category) {
    const descendants = getDescendantIds(categories, cat.id);
    const confirmMessage = descendants.length
      ? `Remover "${cat.name}"? As ${descendants.length} subcategoria(s) dela deixarão de ter um pai (viram categorias de nível topo), e produtos vinculados diretamente a ela ficarão sem categoria.`
      : `Remover a categoria "${cat.name}"? Produtos vinculados ficarão sem categoria.`;

    if (!confirm(confirmMessage)) return;

    const supabase = createClient();
    const { data, error } = await supabase.from('categories').delete().eq('id', cat.id).select();

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.length) {
      // Nenhuma linha apagada: ou RLS bloqueou, ou o registro já não existia
      // mais (ex: removido em outra aba). Nos dois casos, o usuário precisa
      // saber que NADA foi de fato excluído — nunca mostramos "sucesso" aqui.
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }

    toast.success('Categoria removida.');
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-ink/10 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            placeholder="Nome da nova categoria"
            className="input-store"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Descrição (opcional)"
            className="input-store"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="input-store"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Categoria de nível topo (sem pai)</option>
            {tree.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {'—'.repeat(cat.depth)} {cat.depth > 0 ? ' ' : ''}
                {cat.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={saving} className="btn-primary whitespace-nowrap sm:w-auto">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span className="ml-1">{parentId ? 'Criar subcategoria' : 'Criar categoria'}</span>
          </button>
        </div>
        <p className="text-xs text-ink-300">
          Escolha uma categoria pai para criar uma subcategoria (ex: crie "Acessórios", depois
          crie "Pulseiras" com pai "Acessórios", depois "Correntes" com pai "Pulseiras").
        </p>
      </form>

      <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
        {tree.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {editingId === cat.id ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  autoFocus
                  className="input-store"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <select
                  className="input-store"
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                >
                  <option value="">Categoria de nível topo (sem pai)</option>
                  {tree
                    .filter((c) => c.id !== cat.id && !getDescendantIds(categories, cat.id).includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {'—'.repeat(c.depth)} {c.depth > 0 ? ' ' : ''}
                        {c.name}
                      </option>
                    ))}
                </select>
                <button onClick={() => saveRename(cat)} className="text-dourado-700"><Check size={18} /></button>
                <button onClick={() => setEditingId(null)} className="text-ink-300"><X size={18} /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2" style={{ paddingLeft: cat.depth * 20 }}>
                  {cat.depth > 0 && <CornerDownRight size={14} className="shrink-0 text-ink-300" />}
                  <div>
                    <p className="text-sm font-medium text-ink-700">{cat.name}</p>
                    <p className="text-xs text-ink-300">/{cat.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`rounded-full px-2 py-1 text-xs ${
                      cat.is_active ? 'bg-dourado-50 text-dourado-700' : 'bg-ink/5 text-ink-300'
                    }`}
                  >
                    {cat.is_active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditName(cat.name);
                      setEditParentId(cat.parent_id ?? '');
                    }}
                    className="text-ink-500 hover:text-dourado-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(cat)} className="text-ink-500 hover:text-terracota-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {!categories.length && (
          <li className="px-4 py-6 text-center text-sm text-ink-300">Nenhuma categoria criada.</li>
        )}
      </ul>
    </div>
  );
}
