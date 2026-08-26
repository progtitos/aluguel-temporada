import type { Category, CategoryWithDepth } from '@/types';

/**
 * Recebe a lista "achatada" de categorias (como vem do Supabase) e devolve
 * a mesma lista reordenada em formato de árvore (pais antes dos filhos,
 * filhos logo após o pai), com um campo `depth` (0 = nível topo, 1 =
 * subcategoria, 2 = sub-subcategoria, ...) para permitir indentação visual
 * simples em <select> e listas, sem precisar de um componente de árvore.
 *
 * Protegida contra ciclos (ex: A é pai de B que é pai de A) — categorias já
 * visitadas não são revisitadas, então um ciclo nunca causa loop infinito.
 */
export function buildCategoryTree(categories: Category[]): CategoryWithDepth[] {
  const bySlug = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = new Map<string | null, Category[]>();

  for (const cat of bySlug) {
    const key = cat.parent_id ?? null;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(cat);
  }

  const result: CategoryWithDepth[] = [];
  const visited = new Set<string>();

  function walk(parentId: string | null, depth: number) {
    const children = childrenOf.get(parentId) ?? [];
    for (const cat of children) {
      if (visited.has(cat.id)) continue; // proteção contra ciclos
      visited.add(cat.id);
      result.push({ ...cat, depth });
      walk(cat.id, depth + 1);
    }
  }

  walk(null, 0);

  // Qualquer categoria "órfã" (parent_id aponta para algo que não existe
  // mais, ou fazia parte de um ciclo) ainda aparece na lista, no nível topo,
  // em vez de sumir silenciosamente do painel admin.
  for (const cat of bySlug) {
    if (!visited.has(cat.id)) {
      visited.add(cat.id);
      result.push({ ...cat, depth: 0 });
    }
  }

  return result;
}

/** Retorna os ids de todos os descendentes (filhos, netos, ...) de uma categoria. */
export function getDescendantIds(categories: Category[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const cat of categories) {
    if (!cat.parent_id) continue;
    if (!childrenOf.has(cat.parent_id)) childrenOf.set(cat.parent_id, []);
    childrenOf.get(cat.parent_id)!.push(cat.id);
  }

  const result: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [...(childrenOf.get(rootId) ?? [])];

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }

  return result;
}
