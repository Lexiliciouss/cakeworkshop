"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkLog } from "@/types/database";

type EmployeeHours = { employeeId: string; employeeName: string; totalMinutes: number };
type ProductAvg = { productId: string; productName: string; category: string; avgMinutes: number; count: number };

function getDateString(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function ReportPage() {
  const [date, setDate] = useState(() => getDateString(new Date()));
  const [employeeHours, setEmployeeHours] = useState<EmployeeHours[]>([]);
  const [productAvgs, setProductAvgs] = useState<ProductAvg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    async function load() {
      const { data: logs, error: logsErr } = await supabase
        .from("work_logs")
        .select(`
          id,
          employee_id,
          product_id,
          start_time,
          end_time,
          employees(name),
          products(name, category)
        `)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd);

      if (logsErr) {
        setError(logsErr.message);
        setLoading(false);
        return;
      }

      const typed = (logs ?? []) as (WorkLog & {
        employees: { name: string } | null;
        products: { name: string; category: string } | null;
      })[];

      const byEmployee: Record<string, { name: string; minutes: number }> = {};
      const byProduct: Record<string, { name: string; category: string; minutes: number[] }> = {};

      for (const log of typed) {
        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        const minutes = (end - start) / 60000;

        const empName = log.employees?.name ?? "Unknown";
        if (!byEmployee[log.employee_id]) {
          byEmployee[log.employee_id] = { name: empName, minutes: 0 };
        }
        byEmployee[log.employee_id].minutes += minutes;

        const prod = log.products;
        const prodName = prod?.name ?? "Unknown";
        const prodCat = prod?.category ?? "";
        if (!byProduct[log.product_id]) {
          byProduct[log.product_id] = { name: prodName, category: prodCat, minutes: [] };
        }
        byProduct[log.product_id].minutes.push(minutes);
      }

      setEmployeeHours(
        Object.entries(byEmployee).map(([id, v]) => ({
          employeeId: id,
          employeeName: v.name,
          totalMinutes: Math.round(v.minutes * 10) / 10,
        }))
      );

      setProductAvgs(
        Object.entries(byProduct).map(([id, v]) => ({
          productId: id,
          productName: v.name,
          category: v.category,
          avgMinutes: Math.round((v.minutes.reduce((a, b) => a + b, 0) / v.minutes.length) * 10) / 10,
          count: v.minutes.length,
        }))
      );

      setLoading(false);
    }

    load();
  }, [date]);

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
        Daily report
      </h1>

      <div className="mb-6">
        <label htmlFor="report-date" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Date
        </label>
        <input
          id="report-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-amber-200/60 bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">
              Total hours per employee
            </h2>
            {employeeHours.length === 0 ? (
              <p className="text-[var(--muted)]">No work logged for this day.</p>
            ) : (
              <ul className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden divide-y divide-amber-100">
                {employeeHours.map((e) => (
                  <li key={e.employeeId} className="px-4 py-3 flex justify-between items-center">
                    <span className="font-medium">{e.employeeName}</span>
                    <span className="text-[var(--accent)] font-medium">
                      {(e.totalMinutes / 60).toFixed(2)} h
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">
              Average time per product
            </h2>
            {productAvgs.length === 0 ? (
              <p className="text-[var(--muted)]">No work logged for this day.</p>
            ) : (
              <ul className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden divide-y divide-amber-100">
                {productAvgs.map((p) => (
                  <li key={p.productId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <span className="font-medium">{p.productName}</span>
                      <span className="text-sm text-[var(--muted)] ml-2">({p.category})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--muted)]">{p.count} log{p.count !== 1 ? "s" : ""}</span>
                      <span className="text-[var(--accent)] font-medium">
                        {p.avgMinutes} min avg
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
