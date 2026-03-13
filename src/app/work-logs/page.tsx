"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { employees as mockEmployees } from "@/mock/employees";
import { products as mockProducts } from "@/mock/products";
import { WorkLogForm } from "./WorkLogForm";
import { deleteWorkLog } from "./actions";

const LOCAL_LOGS_KEY = "cake-workshop-local-work-logs-v1";

type WorkLogRow = {
  id: string;
  employee_id: string;
  product_id: string;
  partner_employee_id: string | null;
  work_date?: string;
  start_time: string;
  end_time: string;
  quantity?: number;
  notes?: string;
  employee?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
  partner?: { id: string; name: string } | null;
};

type LocalWorkLog = {
  id: string;
  product_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  partner_id?: string | null;
  notes?: string | null;
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

function saveLocalLogs(logs: LocalWorkLog[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

function resolveName(
  id: string,
  employees: { id: string; name: string }[],
  products: { id: string; name: string; category: string }[]
): { empName: string; prodName: string; prodCat: string; partnerName: string } {
  const emp = employees.find((e) => e.id === id);
  const prod = products.find((p) => p.id === id);
  return {
    empName: emp?.name ?? "—",
    prodName: prod?.name ?? "—",
    prodCat: prod?.category ?? "",
    partnerName: emp?.name ?? "—",
  };
}

function formatDuration(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const sec = Math.floor((e - s) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  if (ss > 0) return `${ss}s`;
  return "0s";
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const mockEmployeesForLookup = mockEmployees.map((e) => ({
  id: e.id,
  name: e.name,
}));
const mockProductsForLookup = mockProducts.map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
}));

type Employee = { id: string; name: string };
type Product = { id: string; name: string; category: string };

const TABLE_COLUMNS = [
  { key: "id", label: "Work item id", sortable: true, filterable: false, getValue: (l: WorkLogRow) => (l.id ? String(l.id).slice(0, 8) : ""), getSortValue: (l: WorkLogRow) => l.id ?? "" },
  { key: "date", label: "Date", sortable: true, filterable: true, getValue: (l: WorkLogRow) => formatDateOnly(l.start_time), getSortValue: (l: WorkLogRow) => l.start_time },
  { key: "start", label: "Start", sortable: true, filterable: false, getValue: (l: WorkLogRow) => formatTimeOnly(l.start_time), getSortValue: (l: WorkLogRow) => l.start_time },
  { key: "end", label: "End", sortable: true, filterable: false, getValue: (l: WorkLogRow) => formatTimeOnly(l.end_time), getSortValue: (l: WorkLogRow) => l.end_time },
  { key: "employee", label: "Employee", sortable: true, filterable: true, getValue: (l: WorkLogRow) => l.employee?.name ?? "—", getSortValue: (l: WorkLogRow) => l.employee?.name ?? "" },
  { key: "product", label: "Product", sortable: true, filterable: true, getValue: (l: WorkLogRow) => l.product?.name ?? "—", getSortValue: (l: WorkLogRow) => l.product?.name ?? "" },
  { key: "duration", label: "Duration", sortable: true, filterable: false, getValue: (l: WorkLogRow) => formatDuration(l.start_time, l.end_time), getSortValue: (l: WorkLogRow) => new Date(l.end_time).getTime() - new Date(l.start_time).getTime() },
  { key: "qty", label: "Qty", sortable: true, filterable: true, getValue: (l: WorkLogRow) => String(l.quantity ?? 1), getSortValue: (l: WorkLogRow) => l.quantity ?? 0 },
  { key: "partner", label: "Partner", sortable: true, filterable: true, getValue: (l: WorkLogRow) => l.partner?.name ?? "—", getSortValue: (l: WorkLogRow) => l.partner?.name ?? "" },
  { key: "notes", label: "Notes", sortable: true, filterable: false, getValue: (l: WorkLogRow) => l.notes ?? "—", getSortValue: (l: WorkLogRow) => l.notes ?? "" },
] as const;

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLogRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "local">("supabase");
  const [confirmDelete, setConfirmDelete] = useState<WorkLogRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "date", dir: "asc" });
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = useCallback(async () => {
      setLoading(true);
      setError(null);

      // Fetch employees/products for the form (and fallback lookup)
      const [logsWithJoinRes, empRes, prodRes] = await Promise.all([
        supabase
          .from("work_logs")
          .select(
            `id, employee_id, product_id, partner_employee_id, work_date, start_time, end_time, quantity, notes,
             employee:employees!work_logs_employee_id_fkey(id, name),
             product:products!work_logs_product_id_fkey(id, name),
             partner:employees!work_logs_partner_employee_id_fkey(id, name)`
          )
          .order("work_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(200),
        supabase.from("employees").select("id, name").order("name"),
        supabase.from("products").select("id, name, category").order("name"),
      ]);

      const empList = (empRes.data ?? []) as Employee[];
      const prodList = (prodRes.data ?? []) as Product[];

      if (empList.length) setEmployees(empList);
      if (prodList.length) setProducts(prodList);

      // If join worked, use names from DB directly
      if (
        !logsWithJoinRes.error &&
        logsWithJoinRes.data &&
        logsWithJoinRes.data.length > 0
      ) {
        const rows = logsWithJoinRes.data as Array<{
          id: string;
          employee_id?: string;
          product_id?: string;
          partner_employee_id?: string | null;
          work_date?: string;
          start_time: string;
          end_time: string;
          quantity?: number;
          notes?: string | null;
          employee?: { id: string; name: string } | null;
          product?: { id: string; name: string } | null;
          partner?: { id: string; name: string } | null;
        }>;
        const enriched: WorkLogRow[] = rows.map((log) => ({
          id: log.id,
          employee_id: String(log.employee_id ?? ""),
          product_id: String(log.product_id ?? ""),
          partner_employee_id: log.partner_employee_id ?? null,
          work_date: log.work_date,
          start_time: log.start_time,
          end_time: log.end_time,
          quantity: log.quantity,
          notes: log.notes ?? undefined,
          employee: log.employee ?? null,
          product: log.product ?? null,
          partner: log.partner ?? null,
        }));
        enriched.sort((a, b) => {
          const dA = a.work_date ?? a.start_time.slice(0, 10);
          const dB = b.work_date ?? b.start_time.slice(0, 10);
          if (dA !== dB) return dA.localeCompare(dB);
          return a.start_time.localeCompare(b.start_time);
        });
        setLogs(enriched);
        setSource("supabase");
      } else if (logsWithJoinRes.error) {
        // Join may fail if DB has no FKs – try plain select + client lookup
        const plainRes = await supabase
          .from("work_logs")
          .select("id, employee_id, product_id, partner_employee_id, work_date, start_time, end_time, quantity, notes")
          .order("work_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(200);

        if (!plainRes.error && plainRes.data && plainRes.data.length > 0) {
          const rows = plainRes.data as Array<{
            id: string;
            employee_id?: string;
            product_id?: string;
            partner_employee_id?: string | null;
            work_date?: string;
            start_time: string;
            end_time: string;
            quantity?: number;
            notes?: string | null;
          }>;
          const enriched: WorkLogRow[] = rows.map((log) => {
            const empId = String(log.employee_id ?? "");
            const prodId = String(log.product_id ?? "");
            const partnerId = log.partner_employee_id;
            const { empName, prodName, prodCat } = resolveName(
              empId,
              empList,
              prodList
            );
            const { partnerName } = partnerId
              ? resolveName(partnerId, empList, prodList)
              : { partnerName: "—" };
            return {
              id: log.id,
              employee_id: empId,
              product_id: prodId,
              partner_employee_id: partnerId ?? null,
              work_date: log.work_date,
              start_time: log.start_time,
              end_time: log.end_time,
              quantity: log.quantity,
              notes: log.notes ?? undefined,
              employee: { id: empId, name: empName },
              product: { id: prodId, name: prodName },
              partner: partnerId ? { id: partnerId, name: partnerName } : null,
            };
          });
          enriched.sort((a, b) => {
            const dA = a.work_date ?? a.start_time.slice(0, 10);
            const dB = b.work_date ?? b.start_time.slice(0, 10);
            if (dA !== dB) return dA.localeCompare(dB);
            return a.start_time.localeCompare(b.start_time);
          });
          setLogs(enriched);
          setSource("supabase");
        } else {
          if (plainRes.error) setError(plainRes.error.message);
          const local = plainRes.error ? loadLocalLogs() : [];
          if (local.length === 0) {
            setLogs([]);
            setSource("supabase");
          } else {
            const lookupEmp = empList.length ? empList : mockEmployeesForLookup;
            const lookupProd = prodList.length ? prodList : mockProductsForLookup;
            const enriched: WorkLogRow[] = local.map((log) => {
              const { empName, prodName } = resolveName(
                log.employee_id,
                lookupEmp,
                lookupProd
              );
              const { partnerName } = log.partner_id
                ? resolveName(log.partner_id, lookupEmp, lookupProd)
                : { partnerName: "—" };
              return {
                id: log.id,
                employee_id: log.employee_id,
                product_id: log.product_id,
                partner_employee_id: log.partner_id ?? null,
                start_time: log.start_time,
                end_time: log.end_time,
                notes: log.notes ?? undefined,
                employee: { id: log.employee_id, name: empName },
                product: { id: log.product_id, name: prodName },
                partner: log.partner_id ? { id: log.partner_id, name: partnerName } : null,
              };
            });
            setLogs(enriched);
            setSource("local");
          }
        }
      } else {
        setLogs([]);
        setSource("supabase");
      }

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function handleConfirmDeleteLog() {
    if (!confirmDelete) return;
    const id = String(confirmDelete.id);
    setDeleting(true);
    setDeleteError(null);

    if (source === "local") {
      const remaining = loadLocalLogs().filter((l) => String(l.id) !== id);
      saveLocalLogs(remaining);
      setLogs((prev) => prev.filter((l) => String(l.id) !== id));
      setConfirmDelete(null);
      setDeleting(false);
      return;
    }

    const result = await deleteWorkLog(id);
    if (result?.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    setConfirmDelete(null);
    setDeleting(false);
    loadLogs();
  }

  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Work history
        </h1>
        {source === "local" && (
          <span className="text-xs font-medium rounded-full px-3 py-1 border border-amber-200/60 bg-[var(--surface)] text-[var(--muted)]">
            Showing local data (DB empty or unavailable)
          </span>
        )}
      </div>

      {employees.length > 0 && products.length > 0 && (
        <WorkLogForm employees={employees} products={products} />
      )}
      {employees.length === 0 && products.length === 0 && (
        <p className="mb-6 text-sm text-[var(--muted)]">
          Add employees and products first to create work history.
        </p>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
          <strong>Database error:</strong> {error}
          <br />
          <span className="text-amber-700">Showing locally saved logs instead.</span>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by name, product, partner, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded-lg border border-amber-200/60 bg-[var(--surface)] px-4 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="rounded-xl bg-white p-6 shadow-xl max-w-sm w-full border border-amber-200/60"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--foreground)] font-medium">
              Delete this work history entry?
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {confirmDelete.employee?.name} – {confirmDelete.product?.name} ({formatDateOnly(confirmDelete.start_time)} {formatTimeOnly(confirmDelete.start_time)})
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-2 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-amber-200/60 bg-white font-medium hover:bg-amber-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLog}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-[var(--muted)]">
          No work history yet. Use Log Work to record time.
        </p>
      ) : (() => {
        const colDef = (k: string) => TABLE_COLUMNS.find((c) => c.key === k)!;
        const searchLower = searchQuery.trim().toLowerCase();
        const filtered = logs.filter((log) => {
          if (searchLower) {
            const searchable = [
              log.employee?.name ?? "",
              log.product?.name ?? "",
              log.partner?.name ?? "",
              log.notes ?? "",
            ].join(" ").toLowerCase();
            if (!searchable.includes(searchLower)) return false;
          }
          return TABLE_COLUMNS.every((col) => {
            if (!col.filterable) return true;
            const selected = columnFilters[col.key];
            if (!selected || selected.size === 0) return true;
            const val = col.getValue(log);
            return selected.has(val);
          });
        });
        const sorted = [...filtered].sort((a, b) => {
          const { by: sortBy, dir: sortDir } = sortState;
          const col = colDef(sortBy);
          if (!col) return 0;
          const va = col.getSortValue(a);
          const vb = col.getSortValue(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
          return sortDir === "asc" ? cmp : -cmp;
        });

        return (
        <div className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-xs font-medium uppercase tracking-wide text-[var(--muted)] text-left bg-amber-50/50">
                  {TABLE_COLUMNS.map((col) => {
                    const isSorted = sortState.by === col.key;
                    const filterValues = col.filterable
                      ? [...new Set(logs.map((l) => col.getValue(l)).filter(Boolean))]
                      : [];
                    const selectedCount = (columnFilters[col.key]?.size ?? 0);

                    return (
                      <th key={col.key} className="px-4 py-3 relative group">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => col.sortable && setSortState((prev) => ({
                              by: col.key,
                              dir: prev.by === col.key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
                            }))}
                            className={`text-left hover:text-[var(--foreground)] ${isSorted ? "text-[var(--accent)]" : ""}`}
                          >
                            {col.label}
                          </button>
                          {isSorted && (
                            <span className="text-[var(--accent)]">{sortState.dir === "asc" ? "↑" : "↓"}</span>
                          )}
                          {col.filterable && filterValues.length > 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenFilter(openFilter === col.key ? null : col.key)}
                                className={`p-0.5 rounded hover:bg-amber-200/60 ${selectedCount > 0 ? "text-[var(--accent)]" : ""}`}
                                title="Filter"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                                </svg>
                              </button>
                              {openFilter === col.key && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                  <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] max-h-48 overflow-y-auto rounded-lg border border-amber-200/60 bg-white shadow-lg py-1">
                                    {filterValues.map((val) => {
                                      const checked = !columnFilters[col.key]?.size || columnFilters[col.key]?.has(val);
                                      return (
                                        <label key={val} className="flex items-center gap-2 px-3 py-1.5 hover:bg-amber-50 cursor-pointer text-sm">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              setColumnFilters((prev) => {
                                                const next = new Set(prev[col.key] ?? []);
                                                if (checked) next.delete(val);
                                                else next.add(val);
                                                return { ...prev, [col.key]: next };
                                              });
                                            }}
                                            className="rounded"
                                          />
                                          <span className="truncate">{val || "(empty)"}</span>
                                        </label>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => setColumnFilters((prev) => ({ ...prev, [col.key]: new Set() }))}
                                      className="w-full px-3 py-1.5 text-left text-xs text-[var(--muted)] hover:bg-amber-50"
                                    >
                                      Clear filter
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 w-[48px] sticky right-0 bg-amber-50/50 border-l border-amber-100"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {sorted.map((log) => (
                  <tr key={log.id ? String(log.id) : log.start_time}>
                    {TABLE_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.key === "employee" ? "font-medium" : ""} ${col.key === "product" ? "" : ""} ${col.key === "duration" ? "text-[var(--accent)] font-medium" : ""} ${col.key === "notes" ? "max-w-[120px] truncate text-[var(--muted)]" : ""} ${col.key === "id" ? "font-mono text-xs text-[var(--muted)]" : ""} ${["date", "start", "end"].includes(col.key) ? "text-[var(--muted)]" : ""}`}
                        title={col.key === "id" ? String(log.id) : undefined}
                      >
                        {col.getValue(log) || "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 bg-[var(--surface)] border-l border-amber-100">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(log)}
                        className="p-1.5 rounded text-[var(--muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete work history entry"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(filtered.length < logs.length || searchQuery.trim()) && (
            <p className="px-4 py-2 text-xs text-[var(--muted)] bg-amber-50/30">
              Showing {filtered.length} of {logs.length} rows{searchQuery.trim() ? " (search + filter)" : " (filtered)"}
            </p>
          )}
        </div>
        );
      })()}
    </div>
  );
}
