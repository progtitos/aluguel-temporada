import { createAdminClient } from "@/lib/supabase/server";
import AdminAvailabilityCalendar from "@/components/AdminAvailabilityCalendar";

export const revalidate = 0;

export default async function AdminCalendarPage() {
  const admin = createAdminClient();

  const [{ data: propertiesData }, { data: bookingsData }] = await Promise.all([
    admin.from("properties").select("id, name").order("created_at", { ascending: true }),
    admin
      .from("bookings")
      .select("id, property_id, check_in, check_out, status, guest_name")
      .in("status", ["confirmada", "pendente", "bloqueio"]),
  ]);

  const properties = propertiesData ?? [];
  const propertyNameById = new Map(properties.map((p) => [p.id, p.name]));

  const bookings = (bookingsData ?? []).map((b) => ({
    id: b.id,
    property_id: b.property_id,
    property_name: propertyNameById.get(b.property_id) ?? "—",
    guest_name: b.guest_name,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status,
  }));

  return <AdminAvailabilityCalendar properties={properties} bookings={bookings} />;
}
