import { createAdminClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // O acesso já foi validado no middleware (login + e-mail em ADMIN_EMAILS).
  const admin = createAdminClient();
  const { data: properties } = await admin
    .from("properties")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <AdminSidebar properties={properties ?? []} />
      <div className="flex-1 p-4 sm:p-8">{children}</div>
    </div>
  );
}
