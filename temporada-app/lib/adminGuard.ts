import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/utils";

export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }
  return user;
}
