import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import AdminPropertyEditor from "@/components/AdminPropertyEditor";

export const revalidate = 0;

export default async function AdminPropertyPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!property) notFound();

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, check_in, check_out, status, guest_name")
    .eq("property_id", params.id)
    .in("status", ["confirmada", "pendente", "bloqueio"])
    .order("check_in", { ascending: true });

  const { data: pricingRules } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("property_id", params.id)
    .order("start_date", { ascending: true });

  return (
    <AdminPropertyEditor
      property={property}
      bookings={bookings ?? []}
      pricingRules={pricingRules ?? []}
    />
  );
}
