import { createAdminClient } from '@/lib/supabase/server';
import { CouponManager } from '@/components/admin/CouponManager';
import type { Coupon } from '@/types';

export default async function AdminCouponsPage() {
  const supabase = createAdminClient();
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium text-ink-700">Cupons de Desconto</h1>
      <CouponManager coupons={(coupons as Coupon[]) ?? []} />
    </div>
  );
}
