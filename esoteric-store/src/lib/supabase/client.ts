'use client';

import { createBrowserClient } from '@supabase/ssr';

// Cliente Supabase para uso em componentes client-side ("use client").
// Usa a chave anônima (pública) — respeita as políticas de RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
