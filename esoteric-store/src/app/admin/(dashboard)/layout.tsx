import { Sidebar } from '@/components/admin/Sidebar';

export const metadata = {
  title: 'Painel Administrativo | Universo Encantado',
};

// A proteção de rota (redirecionamento para /admin/login quando não autenticado)
// é feita no middleware.ts raiz do projeto, que roda antes deste layout.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ivory-200/40">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
