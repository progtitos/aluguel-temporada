'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('products').delete().eq('id', productId).select();
    setLoading(false);

    if (error) {
      toast.error('Não foi possível remover o produto.');
      return;
    }
    if (!data?.length) {
      // Sem erro, mas 0 linhas afetadas: RLS bloqueou silenciosamente.
      toast.error(
        'O produto não foi removido — verifique se as políticas de RLS da tabela ' +
          '"products" estão aplicadas no Supabase (rode o schema.sql novamente).',
        { duration: 8000 }
      );
      return;
    }

    toast.success('Produto removido.');
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      onBlur={() => setConfirming(false)}
      className="flex items-center gap-1 text-xs font-medium text-terracota-700 hover:underline"
    >
      <Trash2 size={13} />
      {confirming ? 'Confirmar?' : 'Excluir'}
    </button>
  );
}
