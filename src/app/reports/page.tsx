"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deleteWorkLog } from "@/app/work-logs/actions";

/** Extract readable error message */
function getErrorMessage(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  try {
    const str = String(e);
    return str === "[object Object]" ? "An error occurred" : str;
  } catch {
    return "An error occurred";
  }
}

function getDateString(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function normalizeToIsoDate(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return getDateString(new Date());
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime()) ? getDateString(parsed) : getDateString(new Date());
}

/** Format minutes as "1h 20m", "35m" */
function formatMinutesToHm(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}

function formatHoursToHm(hours: number): string {
  return formatMinutesToHm(Math.round(hours * 60));
}

/** Format ISO timestamp as Sydney time only (no date), e.g. "7:10 am" */
function formatSydneyTimeOnly(iso: string | number | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type QueryResult<T = Record<string, unknown>> = {
  data: T[];
  error: string | null;
  rowCount: number;
};

const TABS = [
  { id: "summary", label: "Work history", key: "work_log_summary" },
  { id: "hours", label: "Employee hours", key: "employee_daily_hours" },
  { id: "costs", label: "Labor costs", key: "employee_daily_costs" },
  { id: "productivity", label: "Productivity", key: "employee_productivity" },
  { id: "products", label: "Product labor", key: "product_labor_summary" },
  { id: "management", label: "Management", key: "daily_management_summary" },
] as const;

/** Default date range: today to today */
function getDefaultDateRange(): { from: string; to: string } {
  const today = getDateString(new Date());
  return { from: today, to: today };
}

/** Format date range for display, e.g. "13 Mar 2026" or "6 Mar 2026 – 13 Mar 2026" */
function formatDateRangeDisplay(from: string, to: string): string {
  const fmt = (s: string) => {
    const d = new Date(s + "T12:00:00Z");
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };
  if (from === to) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

type VizMode = "table" | "pie" | "bar";

const VIZ_OPTIONS: { value: VizMode; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "pie", label: "Pie" },
  { value: "bar", label: "Bar" },
];

/** Extract chart data: label column + numeric value column, aggregated */
function getChartData(rows: Record<string, unknown>[]): { label: string; value: number }[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0] as object);
  const labelCandidates = ["employee_name", "product_name", "work_date", "name", "category"];
  const valueCandidates = ["total_hours", "labor_cost", "actual_minutes", "standard_minutes", "variance_minutes", "quantity", "total_minutes"];
  const labelKey = labelCandidates.find((k) => keys.includes(k)) ?? keys.find((k) => !valueCandidates.includes(k) && typeof (rows[0] as Record<string, unknown>)[k] !== "number");
  const valueKey = valueCandidates.find((k) => keys.includes(k)) ?? keys.find((k) => typeof (rows[0] as Record<string, unknown>)[k] === "number");
  if (!labelKey || !valueKey) return [];

  const map = new Map<string, number>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const label = String(r[labelKey] ?? "—");
    const val = Number(r[valueKey]) || 0;
    map.set(label, (map.get(label) ?? 0) + val);
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
}

function PieChart({ data, colors }: { data: { label: string; value: number }[]; colors?: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-[var(--muted)] py-4">No data to chart.</p>;
  const palette = colors ?? ["#5a7d6a", "#8fa89a", "#a8c4b0", "#c4d9ce", "#7a9a86", "#6b8f7a"];
  let acc = 0;
  return (
    <div className="flex gap-4 items-center flex-wrap">
      <svg viewBox="0 0 100 100" className="w-48 h-48 shrink-0">
        {data.map((d, i) => {
          const pct = d.value / total;
          const startAngle = acc * 360;
          acc += pct;
          const endAngle = acc * 360;
          const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 45 * Math.cos((endAngle * Math.PI) / 180);
          const y2 = 50 + 45 * Math.sin((endAngle * Math.PI) / 180);
          const largeArc = pct > 0.5 ? 1 : 0;
          return pct >= 0.999 ? (
            <circle key={i} cx="50" cy="50" r="45" fill={palette[i % palette.length]} />
          ) : (
            <path key={i} d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={palette[i % palette.length]} />
          );
        })}
      </svg>
      <ul className="text-sm space-y-1 min-w-[120px]">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: palette[i % palette.length] }} />
            <span className="truncate">{d.label}</span>
            <span className="text-[var(--muted)]">{(100 * d.value / total).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BAR_COLORS = ["#5a7d6a", "#8fa89a", "#a8c4b0", "#7a9a86", "#6b8f7a", "#9eb5a5", "#4a6b58", "#c4d9ce"];

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-28 truncate text-sm" title={d.label}>{d.label}</span>
          <div className="flex-1 h-6 rounded bg-[var(--accent-light)]/20 overflow-hidden">
            <div
              className="h-full rounded"
              style={{ width: `${100 * d.value / max}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
            />
          </div>
          <span className="text-sm font-medium w-16 text-right">{d.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

type WorkHistoryRow = Record<string, unknown> & {
  id?: string;
  work_date?: string;
  employee_name?: string;
  product_name?: string;
  actual_minutes?: number;
  standard_minutes?: number;
  variance_minutes?: number;
};

const ROWS_PER_PAGE = 50;

/** Generate AI-style insights from report data (no external API) */
function generateInsights(
  rows: WorkHistoryRow[],
  rateMap: Record<string, number>,
  totalLaborCost: number,
  totalSessions: number,
  dateRangeLabel: string
): {
  dailySummary: string;
  biggestCostDriver: string;
  efficiencyWarning: string;
  suggestedAction: string;
  employeeInsights: string;
} {
  if (rows.length === 0) {
    return {
      dailySummary: `No work sessions recorded for ${dateRangeLabel}. Add work logs to see insights.`,
      biggestCostDriver: "—",
      efficiencyWarning: "—",
      suggestedAction: "Start logging work to track labor cost and productivity.",
      employeeInsights: "No employee data available.",
    };
  }

  const laborByEmployee = new Map<string, number>();
  const varianceByEmployee = new Map<string, { total: number; count: number }>();
  const laborByProduct = new Map<string, number>();
  let maxVariance = 0;
  let maxVarianceRow: WorkHistoryRow | null = null;

  for (const r of rows) {
    const mins = Number(r.actual_minutes ?? 0);
    const emp = String(r.employee_name ?? "").trim();
    const prod = String(r.product_name ?? "").trim();
    const cost = (mins / 60) * (rateMap[emp] ?? 0);
    const variance = Math.abs(Number(r.variance_minutes ?? 0));

    laborByEmployee.set(emp, (laborByEmployee.get(emp) ?? 0) + cost);
    laborByProduct.set(prod, (laborByProduct.get(prod) ?? 0) + cost);
    if (emp) {
      const curr = varianceByEmployee.get(emp) ?? { total: 0, count: 0 };
      varianceByEmployee.set(emp, { total: curr.total + variance, count: curr.count + 1 });
    }
    if (variance > maxVariance) {
      maxVariance = variance;
      maxVarianceRow = r;
    }
  }

  const topEmployee = [...laborByEmployee.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1])[0];
  const topProduct = [...laborByProduct.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1])[0];
  const empCost = topEmployee?.[1] ?? 0;
  const prodCost = topProduct?.[1] ?? 0;
  const costDriver = empCost >= prodCost && topEmployee
    ? topEmployee[0]
    : topProduct?.[0] ?? "—";
  const costDriverType = empCost >= prodCost ? "employee" : "product";

  const dailySummary =
    totalSessions === 1
      ? `One work session recorded for ${dateRangeLabel} with total labor cost of $${totalLaborCost.toFixed(2)} (${formatMinutesToHm(rows[0]?.actual_minutes ?? 0)}).`
      : `For ${dateRangeLabel}, ${totalSessions} work sessions totalled $${totalLaborCost.toFixed(2)} in labor cost across ${formatMinutesToHm(rows.reduce((s, r) => s + Number(r.actual_minutes ?? 0), 0))}.`;

  const biggestCostDriver =
    costDriver === "—"
      ? "—"
      : `Today's labor cost was mainly driven by ${costDriverType === "product" ? `${costDriver} production` : costDriver}.`;

  const efficiencyWarning =
    !maxVarianceRow || maxVariance < 1
      ? "All sessions were within standard time."
      : `${maxVarianceRow.employee_name ?? "Unknown"} had the largest variance (${Number(maxVarianceRow.variance_minutes ?? 0) > 0 ? "over" : "under"} standard by ${formatMinutesToHm(maxVariance)}) for ${maxVarianceRow.product_name ?? "unknown product"}.`;

  const onTarget = rows.filter((r) => Math.abs(Number(r.variance_minutes ?? 0)) < 5);
  const onTargetProduct = onTarget.length > 0 ? onTarget[0]?.product_name : null;

  let suggestedAction: string;
  if (maxVarianceRow && maxVariance >= 10) {
    suggestedAction = `Consider reviewing the ${maxVarianceRow.product_name ?? "work"} workflow${maxVarianceRow.employee_name ? `, especially for sessions involving ${maxVarianceRow.employee_name}` : ""}.`;
  } else if (onTargetProduct) {
    suggestedAction = `${onTargetProduct} was completed on target. Keep up the standard process.`;
  } else {
    suggestedAction = "Monitor variance trends over the next few days to identify any patterns.";
  }

  const empByCost = [...laborByEmployee.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  const empByVariance = [...varianceByEmployee.entries()]
    .filter(([k]) => k)
    .map(([n, v]) => ({ name: n, avg: v.total / v.count }))
    .sort((a, b) => a.avg - b.avg);
  const topCostEmp = empByCost[0]?.[0];
  const mostEfficient = empByVariance[0]?.name;
  const leastEfficient = empByVariance[empByVariance.length - 1]?.name;
  let employeeInsights = "";
  if (topCostEmp || mostEfficient) {
    employeeInsights =
      topCostEmp && empByCost[0]
        ? `${topCostEmp} had the highest labor cost ($${empByCost[0][1].toFixed(2)}). `
        : "";
    if (mostEfficient && leastEfficient && mostEfficient !== leastEfficient) {
      employeeInsights += `${mostEfficient} showed the best efficiency; ${leastEfficient} had the highest variance and may need workflow review.`;
    } else if (mostEfficient) {
      employeeInsights += `Efficiency varies by employee; review variance by person for targeted improvements.`;
    } else {
      employeeInsights = employeeInsights.trim() || "Review employee-level cost and variance in the Productivity tab.";
    }
  } else {
    employeeInsights = "No employee breakdown available.";
  }

  return { dailySummary, biggestCostDriver, efficiencyWarning, suggestedAction, employeeInsights };
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange());
  const [loading, setLoading] = useState(true);
  const [filteredWorkHistory, setFilteredWorkHistory] = useState<WorkHistoryRow[]>([]);
  const [employees, setEmployees] = useState<Array<{ name: string; hourly_rate: number }>>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [otherTabData, setOtherTabData] = useState<Record<string, QueryResult>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [openTabs, setOpenTabs] = useState<Set<string>>(new Set(["summary", "hours"]));
  const [workHistoryPage, setWorkHistoryPage] = useState(1);
  const [vizMode, setVizMode] = useState<Record<string, VizMode>>({});
  const [confirmDelete, setConfirmDelete] = useState<WorkHistoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<{
    dailySummary: string;
    biggestCostDriver: string;
    efficiencyWarning: string;
    suggestedAction: string;
    employeeInsights: string;
  } | null>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [askQuestion, setAskQuestion] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);

  const dateFrom = normalizeToIsoDate(dateRange.from);
  const dateTo = normalizeToIsoDate(dateRange.to);
  const effectiveFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const effectiveTo = dateFrom <= dateTo ? dateTo : dateFrom;

  useEffect(() => {
    setLoading(true);
    setErrors([]);
    setSummaryError(null);
    setWorkHistoryPage(1);

    async function load() {
      const [summaryRes, empRes, ...rest] = await Promise.all([
        supabase
          .from("work_log_summary")
          .select("*")
          .gte("work_date", effectiveFrom)
          .lte("work_date", effectiveTo)
          .order("work_date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase.from("employees").select("name, hourly_rate"),
        supabase.from("employee_daily_hours").select("*").gte("work_date", effectiveFrom).lte("work_date", effectiveTo).limit(500),
        supabase.from("employee_daily_costs").select("*").gte("work_date", effectiveFrom).lte("work_date", effectiveTo).limit(500),
        supabase.from("employee_productivity").select("*").gte("work_date", effectiveFrom).lte("work_date", effectiveTo).limit(500),
        supabase.from("product_labor_summary").select("*").gte("work_date", effectiveFrom).lte("work_date", effectiveTo).limit(500),
        supabase.from("daily_management_summary").select("*").gte("work_date", effectiveFrom).lte("work_date", effectiveTo).limit(500),
      ]);

      const rows = (summaryRes.data ?? []) as WorkHistoryRow[];
      setFilteredWorkHistory(rows);
      setSummaryError(summaryRes.error ? getErrorMessage(summaryRes.error) : null);
      setEmployees((empRes.data ?? []) as Array<{ name: string; hourly_rate: number }>);

      const otherNames = ["employee_daily_hours", "employee_daily_costs", "employee_productivity", "product_labor_summary", "daily_management_summary"] as const;
      const others: Record<string, QueryResult> = {};
      rest.forEach((res, i) => {
        const data = (res.data ?? []) as Record<string, unknown>[];
        const errorMsg = res.error ? getErrorMessage(res.error) : null;
        others[otherNames[i]] = { data, error: errorMsg, rowCount: data.length };
        if (errorMsg) setErrors((prev) => [...prev, `${otherNames[i]}: ${errorMsg}`]);
      });
      setOtherTabData(others);
      setLoading(false);
    }
    load();
  }, [effectiveFrom, effectiveTo]);

  const rateMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.name, Number(e.hourly_rate) || 0])),
    [employees]
  );

  const totalSessions = filteredWorkHistory.length;
  const totalMinutes = filteredWorkHistory.reduce((s, r) => s + Number(r.actual_minutes ?? 0), 0);
  const totalHours = totalMinutes / 60;
  const totalLaborCost = filteredWorkHistory.reduce((s, r) => {
    const mins = Number(r.actual_minutes ?? 0);
    const name = r.employee_name ?? "";
    return s + (mins / 60) * (rateMap[name] ?? 0);
  }, 0);
  const activeEmployeesCount = new Set(filteredWorkHistory.map((r) => r.employee_name).filter(Boolean)).size;

  useEffect(() => {
    if (loading) return;

    const aborter = new AbortController();

    const laborByEmployee = new Map<string, number>();
    const laborByProduct = new Map<string, number>();
    const varianceByProduct = new Map<string, number>();
    const varianceByEmployee = new Map<string, { total: number; count: number }>();

    for (const r of filteredWorkHistory) {
      const mins = Number(r.actual_minutes ?? 0);
      const emp = String(r.employee_name ?? "").trim();
      const prod = String(r.product_name ?? "").trim();
      const cost = (mins / 60) * (rateMap[emp] ?? 0);
      const variance = Math.abs(Number(r.variance_minutes ?? 0));

      laborByEmployee.set(emp, (laborByEmployee.get(emp) ?? 0) + cost);
      laborByProduct.set(prod, (laborByProduct.get(prod) ?? 0) + cost);
      varianceByProduct.set(prod, (varianceByProduct.get(prod) ?? 0) + variance);
      if (emp) {
        const curr = varianceByEmployee.get(emp) ?? { total: 0, count: 0 };
        varianceByEmployee.set(emp, {
          total: curr.total + variance,
          count: curr.count + 1,
        });
      }
    }

    const topVarianceProductEntry = [...varianceByProduct.entries()]
      .filter(([k]) => k)
      .sort((a, b) => b[1] - a[1])[0];
    const topVarianceProduct = topVarianceProductEntry ? `${topVarianceProductEntry[0]} (${formatMinutesToHm(topVarianceProductEntry[1])} variance)` : "—";

    const topEmployee = [...laborByEmployee.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1])[0];
    const topProduct = [...laborByProduct.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1])[0];
    const empCost = topEmployee?.[1] ?? 0;
    const prodCost = topProduct?.[1] ?? 0;
    const biggestCostDriver =
      empCost >= prodCost && topEmployee
        ? `Employee: ${topEmployee[0]}`
        : topProduct
          ? `Product: ${topProduct[0]}`
          : "—";

    const productivityRanking = [...varianceByEmployee.entries()]
      .filter(([k]) => k)
      .map(([name, v]) => ({ name, avg: v.total / v.count }))
      .sort((a, b) => a.avg - b.avg)
      .map((x) => x.name);

    const employeeBreakdown = [...laborByEmployee.entries()]
      .filter(([k]) => k)
      .map(([name, cost]) => {
        const v = varianceByEmployee.get(name);
        const avgVariance = v ? v.total / v.count : 0;
        const hours = filteredWorkHistory
          .filter((r) => String(r.employee_name ?? "").trim() === name)
          .reduce((s, r) => s + Number(r.actual_minutes ?? 0), 0) / 60;
        return { name, laborCost: cost, hours, avgVarianceMinutes: avgVariance };
      })
      .sort((a, b) => b.laborCost - a.laborCost);

    setAiInsights(null);
    setAiInsightsError(null);
    setAiInsightsLoading(true);

    fetch("/api/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: formatDateRangeDisplay(effectiveFrom, effectiveTo),
        totalLaborCost,
        totalHours,
        activeEmployees: activeEmployeesCount,
        totalWorkSessions: totalSessions,
        topVarianceProduct,
        biggestCostDriver,
        productivityRanking,
        employeeBreakdown,
      }),
      signal: aborter.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Request failed");
        setAiInsights({
          dailySummary: data.dailySummary,
          biggestCostDriver: data.biggestCostDriver,
          efficiencyWarning: data.efficiencyWarning,
          suggestedAction: data.suggestedAction,
          employeeInsights: data.employeeInsights ?? "No employee data available for analysis.",
        });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setAiInsightsError(getErrorMessage(err));
      })
      .finally(() => {
        setAiInsightsLoading((prev) => (aborter.signal.aborted ? prev : false));
      });

    return () => aborter.abort();
  }, [
    loading,
    effectiveFrom,
    effectiveTo,
    filteredWorkHistory,
    rateMap,
    totalLaborCost,
    totalHours,
    activeEmployeesCount,
    totalSessions,
  ]);

  const workHistoryPaginatedRows = filteredWorkHistory.slice((workHistoryPage - 1) * ROWS_PER_PAGE, workHistoryPage * ROWS_PER_PAGE);
  const workHistoryTotalPages = Math.ceil(filteredWorkHistory.length / ROWS_PER_PAGE) || 1;

  const dailyHours = otherTabData.employee_daily_hours;
  const dailyCosts = otherTabData.employee_daily_costs;
  const productivity = otherTabData.employee_productivity;
  const productLabor = otherTabData.product_labor_summary;
  const management = otherTabData.daily_management_summary;

  const dailyHoursRows = dailyHours?.data ?? [];
  const dailyCostsRows = dailyCosts?.data ?? [];
  const productivityRows = productivity?.data ?? [];
  const productLaborRows = productLabor?.data ?? [];
  const managementRows = management?.data ?? [];

  const hasSummaryError = summaryError;
  const hasHoursError = dailyHours?.error;
  const hasCostsError = dailyCosts?.error;
  const hasProductivityError = productivity?.error;
  const hasProductLaborError = productLabor?.error;
  const hasManagementError = management?.error;

  function toggleTab(id: string) {
    setOpenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const TAB_DATA: Record<string, { error?: string; rows: Record<string, unknown>[]; rowCount: number }> = {
    summary: { error: hasSummaryError ?? undefined, rows: filteredWorkHistory, rowCount: totalSessions },
    hours: { error: hasHoursError ?? undefined, rows: dailyHoursRows, rowCount: dailyHours?.rowCount ?? 0 },
    costs: { error: hasCostsError ?? undefined, rows: dailyCostsRows, rowCount: dailyCosts?.rowCount ?? 0 },
    productivity: { error: hasProductivityError ?? undefined, rows: productivityRows, rowCount: productivity?.rowCount ?? 0 },
    products: { error: hasProductLaborError ?? undefined, rows: productLaborRows, rowCount: productLabor?.rowCount ?? 0 },
    management: { error: hasManagementError ?? undefined, rows: managementRows, rowCount: management?.rowCount ?? 0 },
  };

  async function handleAskAi(e: React.FormEvent) {
    e.preventDefault();
    const q = askQuestion.trim();
    if (!q || askLoading) return;
    setAskError(null);
    setAskAnswer(null);
    setAskLoading(true);
    try {
      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, dateFrom: effectiveFrom, dateTo: effectiveTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      setAskAnswer(data.answer ?? "");
    } catch (err) {
      setAskError(getErrorMessage(err));
    } finally {
      setAskLoading(false);
    }
  }

  async function handleConfirmDeleteReportLog() {
    if (!confirmDelete) return;
    const id = String(confirmDelete.id);
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteWorkLog(id);
    setConfirmDelete(null);
    setDeleting(false);
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }
    setFilteredWorkHistory((prev) => prev.filter((r) => String(r.id) !== id));
  }

  return (
    <div className="py-8">
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && (setConfirmDelete(null), setDeleteError(null))}
        >
          <div
            className="rounded-xl bg-white p-6 shadow-xl max-w-sm w-full border border-[var(--accent-light)]/60"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--foreground)] font-medium">Delete this work history entry?</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {confirmDelete.employee_name} – {confirmDelete.product_name}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">This cannot be undone.</p>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => (setConfirmDelete(null), setDeleteError(null))}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[var(--accent-light)]/60 hover:bg-[var(--surface)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReportLog}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Reports
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-[var(--muted)]">Date range</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: normalizeToIsoDate(e.target.value) }))}
              className="rounded-lg border border-[var(--accent-light)]/60 bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
            <span className="text-[var(--muted)]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: normalizeToIsoDate(e.target.value) }))}
              className="rounded-lg border border-[var(--accent-light)]/60 bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm space-y-1">
          {errors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <p className="text-[var(--muted)]">Loading…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards – all derived from filteredWorkHistory */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Work date</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {formatDateRangeDisplay(effectiveFrom, effectiveTo)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Total labor cost</p>
              <p className="mt-1 text-xl font-semibold text-[var(--accent)]">${totalLaborCost.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Total hours</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {formatMinutesToHm(totalHours * 60)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Total minutes</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {formatMinutesToHm(totalMinutes)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Active employees</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{activeEmployeesCount}</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Work sessions</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{totalSessions}</p>
            </div>
          </div>

          {/* AI section – unified styling with app accent */}
          <div className="rounded-2xl border border-[var(--accent-light)]/30 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--accent-light)]/20 bg-gradient-to-b from-[var(--accent)]/8 to-transparent">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">AI Insights ✨</h2>
              <p className="text-xs text-[var(--muted)] mt-1">Summary and Q&A · Powered by OpenAI (gpt-4o-mini)</p>
            </div>

            <div className="p-5 space-y-6">
              {/* AI Analysis */}
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">Analysis</h3>
                {aiInsightsLoading ? (
                  <div className="py-10 text-center">
                    <div className="inline-flex items-center gap-2 text-[var(--muted)] text-sm">
                      <svg className="animate-spin h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating insights…
                    </div>
                  </div>
                ) : aiInsightsError ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                      {aiInsightsError}
                    </div>
                    <p className="text-xs text-[var(--muted)]">Showing fallback insights below.</p>
                  </div>
                ) : null}
                {!aiInsightsLoading && (() => {
                  const fallbackInsights = generateInsights(
                    filteredWorkHistory,
                    rateMap,
                    totalLaborCost,
                    totalSessions,
                    formatDateRangeDisplay(effectiveFrom, effectiveTo)
                  );
                  const insights = aiInsights ?? fallbackInsights;
                  const items = [
                    { label: "Daily Summary", value: insights.dailySummary },
                    { label: "Biggest Cost Driver", value: insights.biggestCostDriver },
                    { label: "Efficiency Warning", value: insights.efficiencyWarning },
                    { label: "Suggested Action", value: insights.suggestedAction },
                    { label: "Employee Insights", value: insights.employeeInsights },
                  ];
                  return (
                    <div className="space-y-4">
                      {items.map(({ label, value }) => (
                        <div key={label} className="border-b border-[var(--accent-light)]/15 last:border-0 last:pb-0 pb-4 last:pb-0">
                          <p className="text-xs font-medium text-[var(--muted)] mb-1.5">{label}</p>
                          <p className="text-sm text-[var(--foreground)] leading-relaxed">{value}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--accent-light)]/20" />

              {/* Ask AI */}
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">Ask a question</h3>
                <form onSubmit={handleAskAi} className="flex gap-2">
                  <input
                    type="text"
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder="e.g. Who had the highest labor cost?"
                    disabled={askLoading}
                    className="flex-1 rounded-lg border border-[var(--accent-light)]/40 bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={askLoading || !askQuestion.trim()}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {askLoading ? "Asking…" : "Ask"}
                  </button>
                </form>
                {askError && (
                  <p className="mt-2 text-sm text-red-600">{askError}</p>
                )}
                {askAnswer && (
                  <div className="mt-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--accent-light)]/20">
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">{askAnswer}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible tabs */}
          <div className="space-y-2">
            {TABS.map((tab) => {
              const isOpen = openTabs.has(tab.id);
              const { error, rows, rowCount } = TAB_DATA[tab.id] ?? { rows: [], rowCount: 0 };
              const isWorkHistory = tab.id === "summary";
              const displayRows = isWorkHistory ? workHistoryPaginatedRows : rows;
              const hasData = rows.length > 0;

              return (
                <div
                  key={tab.id}
                  className="rounded-xl border border-[var(--accent-light)]/40 bg-[var(--surface)] overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleTab(tab.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--accent)]/5 transition-colors"
                  >
                    <span className="font-medium text-[var(--foreground)]">{tab.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">
                        {isWorkHistory ? `${rowCount} sessions` : `${rowCount} ${rowCount === 1 ? "row" : "rows"}`}
                      </span>
                      <svg
                        className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[var(--accent-light)]/30 px-4 py-4 bg-[var(--background)]/50">
                      {error ? (
                        <p className="text-red-600 text-sm py-2">{error}</p>
                      ) : !hasData ? (
                        <p className="text-[var(--muted)] text-sm py-2">No data.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted)]">View:</span>
                            {VIZ_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setVizMode((prev) => ({ ...prev, [tab.id]: opt.value }))}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                  (vizMode[tab.id] ?? "table") === opt.value
                                    ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--foreground)]"
                                    : "border-[var(--accent-light)]/40 hover:bg-[var(--surface)]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {(vizMode[tab.id] ?? "table") === "table" && (
                        <div className="space-y-2">
                          <div className="overflow-x-auto rounded-lg border border-[var(--accent-light)]/30">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--accent-light)]/30 bg-[var(--surface)] text-xs font-medium uppercase tracking-wide text-[var(--muted)] text-left">
                                  {Object.keys(displayRows[0] as object).map((k) => (
                                    <th key={k} className="px-4 py-3">
                                      {k === "id" ? "Work item id" : k.replace(/_/g, " ")}
                                    </th>
                                  ))}
                                  {isWorkHistory && (
                                    <th className="px-4 py-3 w-[48px]"></th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--accent-light)]/20">
                                {displayRows.map((row, i) => (
                                  <tr key={(row as { id?: string }).id ?? i} className="hover:bg-[var(--surface)]/80">
                                    {(Object.keys(row as object) as (keyof typeof row)[]).map((k) => {
                                      const v = (row as Record<string, unknown>)[k];
                                      const display =
                                        (k === "start_time" || k === "end_time")
                                          ? formatSydneyTimeOnly(v as string)
                                          : String(v ?? "—");
                                      return (
                                        <td key={k} className="px-4 py-3">
                                          {display}
                                        </td>
                                      );
                                    })}
                                    {isWorkHistory && (row as WorkHistoryRow).id && (
                                      <td className="px-4 py-3">
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDelete(row as WorkHistoryRow)}
                                          className="p-1.5 rounded text-[var(--muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                                          aria-label="Delete"
                                          title="Delete"
                                        >
                                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            <line x1="10" y1="11" x2="10" y2="17" />
                                            <line x1="14" y1="11" x2="14" y2="17" />
                                          </svg>
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {isWorkHistory && workHistoryTotalPages > 1 && (
                            <div className="flex items-center justify-between px-2 py-1 text-xs text-[var(--muted)]">
                              <span>
                                Page {workHistoryPage} of {workHistoryTotalPages}
                                {rowCount > 0 && ` (${rowCount} total)`}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWorkHistoryPage((p) => Math.max(1, p - 1))}
                                  disabled={workHistoryPage <= 1}
                                  className="px-2 py-1 rounded border border-[var(--accent-light)]/40 hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Previous
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWorkHistoryPage((p) => Math.min(workHistoryTotalPages, p + 1))}
                                  disabled={workHistoryPage >= workHistoryTotalPages}
                                  className="px-2 py-1 rounded border border-[var(--accent-light)]/40 hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                          )}
                          {(vizMode[tab.id] ?? "table") === "pie" && (
                            <PieChart data={getChartData(rows)} />
                          )}
                          {(vizMode[tab.id] ?? "table") === "bar" && (
                            <BarChart data={getChartData(rows)} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!loading && (
            <p className="mt-6 text-xs text-[var(--muted)]">
              Showing data for {formatDateRangeDisplay(effectiveFrom, effectiveTo)} (filtered outlier data)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
