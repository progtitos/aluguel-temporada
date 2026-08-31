import { createAdminClient } from "@/lib/supabase/server";
import AdminCouponsManager from "@/components/AdminCouponsManager";

export const revalidate = 0;

export default async function AdminCouponsPage() {
  const admin = createAdminClient();
  const { data: coupons } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return <AdminCouponsManager initialCoupons={coupons ?? []} />;
}
