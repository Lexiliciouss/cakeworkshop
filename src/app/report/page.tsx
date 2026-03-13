"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkLog } from "@/types/database";
import { employees as mockEmployees } from "@/mock/employees";
import { products as mockProducts } from "@/mock/products";
import { workLogs as seededMockLogs } from "@/mock/workLogs";

type EmployeeHours = { employeeId: string; employeeName: string; totalMinutes: number };
type ProductAvg = { productId: string; productName: string; category: string; avgMinutes: number; count: number };

const LOCAL_LOGS_KEY = "cake-workshop-local-work-logs-v1";

function getDateString(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

type LocalWorkLog = {
  id: string;
  product_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  partner_id?: string | null;
};

function loadLocalLogs(): LocalWorkLog[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_LOGS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalWorkLog[];
  } catch {
    return [];
  }
}

function ensureSeededLocalLogs() {
  try {
    const existing = loadLocalLogs();
    if (existing.length > 0) return;
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(seededMockLogs));
  } catch {
    // ignore
  }
}

function sameDay(dateStr: string, iso: string) {
  // Compare in local time to match tablet expectations
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` === dateStr;
}

export default function ReportPage() {
  const [date, setDate] = useState(() => getDateString(new Date()));
  const [employeeHours, setEmployeeHours] = useState<EmployeeHours[]>([]);
  const [productAvgs, setProductAvgs] = useState<ProductAvg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingLocal, setUsingLocal] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setUsingLocal(false);

    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    async function load() {
      // Try Supabase first
      try {
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

        if (!logsErr && logs && logs.length > 0) {
          const typed = logs as (WorkLog & {
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
          return;
        }
      } catch {
        // ignore; fall back to local
      }

      // Fallback: localStorage + seeded mock logs
      ensureSeededLocalLogs();
      setUsingLocal(true);

      const employeesById = new Map(mockEmployees.map((e) => [e.id, e.name]));
      const productsById = new Map(mockProducts.map((p) => [p.id, { name: p.name, category: p.category }]));

      const localLogs = loadLocalLogs().filter((l) => sameDay(date, l.start_time));

      const byEmployee: Record<string, { name: string; minutes: number }> = {};
      const byProduct: Record<string, { name: string; category: string; minutes: number[] }> = {};

      for (const log of localLogs) {
        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        const minutes = (end - start) / 60000;

        const empName = employeesById.get(log.employee_id) ?? "Unknown";
        if (!byEmployee[log.employee_id]) byEmployee[log.employee_id] = { name: empName, minutes: 0 };
        byEmployee[log.employee_id].minutes += minutes;

        const prod = productsById.get(log.product_id);
        const prodName = prod?.name ?? "Unknown";
        const prodCat = prod?.category ?? "";
        if (!byProduct[log.product_id]) byProduct[log.product_id] = { name: prodName, category: prodCat, minutes: [] };
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Daily report
        </h1>
        {usingLocal ? (
          <span className="text-xs font-medium rounded-full px-3 py-1 border border-amber-200/60 bg-[var(--surface)] text-[var(--muted)]">
            Local/mock data
          </span>
        ) : null}
      </div>

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
