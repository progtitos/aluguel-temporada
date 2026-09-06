import { formatBRL } from "@/lib/utils";

export type MonthlyRevenue = { label: string; total: number };

export default function AdminRevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="rounded-xl2 bg-white p-4 shadow-soft ring-1 ring-forest-100 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">Faturamento mensal</h2>
        <span className="text-xs text-ink/40">últimos {data.length} meses</span>
      </div>
      <div className="flex h-24 items-end gap-2 sm:gap-3">
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const heightPct = Math.max(4, (d.total / max) * 100);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] text-ink/40">{d.total > 0 ? formatBRL(d.total) : ""}</span>
              <div
                className={`w-full rounded-t ${isLast ? "bg-amber-500" : "bg-forest-100"}`}
                style={{ height: `${heightPct}%` }}
                title={`${d.label}: ${formatBRL(d.total)}`}
              />
              <span className={`text-[10px] ${isLast ? "font-medium text-ink" : "text-ink/40"}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
