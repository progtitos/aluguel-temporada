import { createAdminClient } from "@/lib/supabase/server";
import { AdminPropertiesProvider } from "@/components/AdminPropertiesProvider";
import AdminSidebar from "@/components/AdminSidebar";

export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // O acesso já foi validado no middleware (login + e-mail em ADMIN_EMAILS).
  const admin = createAdminClient();
  const { data: properties } = await admin
    .from("properties")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <AdminPropertiesProvider initialProperties={properties ?? []}>
      <div className="flex min-h-screen flex-col sm:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-4 sm:p-8">{children}</div>
      </div>
    </AdminPropertiesProvider>
  );
}
