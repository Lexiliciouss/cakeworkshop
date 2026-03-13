"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Product, Employee } from "@/types/database";

type Step = "employee" | "product" | "timer" | "partner" | "note" | "done";

const EMPLOYEE_KEY = "cake-workshop-selected-employee-id";
const LOCAL_LOGS_KEY = "cake-workshop-local-work-logs-v1";

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
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
}

export default function LogWorkPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [step, setStep] = useState<Step>("employee");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(EMPLOYEE_KEY);
    }
    return null;
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbSaved, setDbSaved] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        const [pRes, eRes] = await Promise.all([
          supabase.from("products").select("*").order("name"),
          supabase.from("employees").select("*").order("name"),
        ]);

        if (pRes.error) throw pRes.error;
        if (eRes.error) throw eRes.error;

        const p = (pRes.data ?? []) as Product[];
        const e = (eRes.data ?? []) as Employee[];

        setProducts(p);
        setEmployees(e);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load from database");
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId && typeof window !== "undefined") {
      localStorage.setItem(EMPLOYEE_KEY, selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const partner = employees.find((e) => e.id === partnerId);

  const employeesByRole = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const e of employees) {
      const role = (e.role || "Other").trim() || "Other";
      const list = map.get(role) ?? [];
      list.push(e);
      map.set(role, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [employees]);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startTime) return;
    if (endTime) return;
    if (step !== "timer") return;

    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startTime, endTime, step]);

  const elapsedSeconds = useMemo(() => {
    if (!startTime) return 0;
    const end = endTime ? endTime.getTime() : nowMs;
    return Math.max(0, Math.floor((end - startTime.getTime()) / 1000));
  }, [startTime, endTime, nowMs]);

  const elapsedHms = useMemo(() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  function handleSelectEmployee(id: string) {
    setSelectedEmployeeId(id);
    setStep("product");
  }

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    setStep("timer");
  }

  function handleStartWork() {
    setStartTime(new Date());
  }

  function handleEndWork() {
    if (!startTime) return;
    setEndTime(new Date());
    setStep("partner");
  }

  function handleSkipPartner() {
    setStep("note");
  }

  function handleSelectPartner(id: string) {
    setPartnerId(id);
    setStep("note");
  }

  function handleSkipNote() {
    setSavedNote(null);
    setStep("done");
    saveLog(partnerId, null);
  }

  function handleSubmitNote() {
    const note = notes.trim() || null;
    setSavedNote(note);
    setStep("done");
    saveLog(partnerId, note);
  }

  async function saveLog(partnerIdValue?: string | null, notesValue?: string | null) {
    if (!selectedEmployeeId || !selectedProductId || !startTime || !endTime) return;
    setSaving(true);
    setError(null);
    setDbSaved(null);

    const newLog: LocalWorkLog = {
      id: `local_${Date.now()}`,
      product_id: selectedProductId,
      employee_id: selectedEmployeeId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      partner_id: partnerIdValue ?? partnerId ?? null,
      notes: notesValue ?? null,
    };

    try {
      const existing = loadLocalLogs();
      saveLocalLogs([newLog, ...existing]);
    } catch {
      // ignore localStorage failures
    }

    try {
      const row = {
        employee_id: newLog.employee_id,
        product_id: newLog.product_id,
        partner_employee_id: newLog.partner_id ?? null,
        work_date: newLog.start_time.slice(0, 10),
        start_time: newLog.start_time,
        end_time: newLog.end_time,
        quantity: 1,
        notes: newLog.notes ?? null,
      };
      const { error: err } = await supabase.from("work_logs").insert(row as never);
      if (err) {
        console.error("[work_logs insert] Supabase error:", err);
        setError(err.message);
        setDbSaved(false);
      } else {
        setDbSaved(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save to database";
      console.error("[work_logs insert] Error:", e);
      setError(msg);
      setDbSaved(false);
    }
    setSaving(false);
  }

  function reset() {
    setStep("employee");
    setSelectedProductId(null);
    setPartnerId(null);
    setNotes("");
    setSavedNote(null);
    setStartTime(null);
    setEndTime(null);
    setError(null);
    setDbSaved(null);
  }

  const durationMs = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const durationHms = (() => {
    const h = Math.floor(durationSeconds / 3600);
    const m = Math.floor((durationSeconds % 3600) / 60);
    const s = durationSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Log work
        </h1>
      </div>

      {loadError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
          {loadError} — Add employees and products in Supabase first, then refresh.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step: Choose employee */}
      {step === "employee" && (
        <div>
          {employees.length === 0 && !loadError ? (
            <p className="text-[var(--muted)]">
              No employees yet. Add them on the <Link href="/employees" className="text-[var(--accent)] underline">Employees</Link> page first.
            </p>
          ) : employees.length === 0 ? null : (
          <>
          <p className="text-[var(--muted)] mb-4">Who is working?</p>
          <div className="space-y-6">
            {employeesByRole.map(([role, roleEmployees]) => (
              <section key={role}>
                <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                  {role}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {roleEmployees.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => handleSelectEmployee(e.id)}
                      className="p-4 rounded-xl border border-amber-200/60 bg-[var(--surface)] text-left font-medium hover:border-[var(--accent-light)] hover:bg-amber-50 transition-colors"
                    >
                      {e.name}
                    </button>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          </>
          )}
        </div>
      )}

      {/* Step: Choose product */}
      {step === "product" && (
        <div>
          <p className="text-[var(--muted)] mb-2">
            Logging as <strong className="text-[var(--foreground)]">{selectedEmployee?.name}</strong>
          </p>
          {products.length === 0 ? (
            <p className="text-[var(--muted)]">
              No products yet. Add them on the <Link href="/products" className="text-[var(--accent)] underline">Products</Link> page first.
            </p>
          ) : (
          <>
          <p className="text-[var(--muted)] mb-4">Which product?</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProduct(p.id)}
                className="p-4 rounded-xl border border-amber-200/60 bg-[var(--surface)] text-left hover:border-[var(--accent-light)] hover:bg-amber-50 transition-colors"
              >
                <span className="font-medium">{p.name}</span>
                <span className="block text-sm text-[var(--muted)]">{p.category}</span>
              </button>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setStep("employee")}
            className="mt-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Change person
          </button>
          </>
          )}
        </div>
      )}

      {/* Step: Timer (started) */}
      {step === "timer" && (
        <div>
          <p className="text-[var(--muted)] mb-2">
            <strong className="text-[var(--foreground)]">{selectedEmployee?.name}</strong> → {selectedProduct?.name}
          </p>
          <p className="text-sm text-[var(--muted)] mb-4">
            {startTime ? (
              <>Started at {startTime.toLocaleTimeString()}</>
            ) : (
              <>Press <strong className="text-[var(--foreground)]">Start work</strong> to begin.</>
            )}
          </p>
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60 text-center">
            <p className="text-3xl font-semibold text-[var(--accent)]">
              {elapsedHms}
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">elapsed</p>
          </div>
          {!startTime ? (
            <button
              type="button"
              onClick={handleStartWork}
              className="mt-6 w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              Start work
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEndWork}
              className="mt-6 w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              End work
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Step: Optional partner */}
      {step === "partner" && (
        <div>
          <p className="text-[var(--muted)] mb-4">
            Did someone work with you? (optional)
          </p>
          <div className="space-y-6">
            {employeesByRole.map(([role, roleEmployees]) => {
              const others = roleEmployees.filter((e) => e.id !== selectedEmployeeId);
              if (others.length === 0) return null;
              return (
                <section key={role}>
                  <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                    {role}
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {others.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => handleSelectPartner(e.id)}
                        className="p-4 rounded-xl border border-amber-200/60 bg-[var(--surface)] text-left font-medium hover:border-[var(--accent-light)] hover:bg-amber-50 transition-colors"
                      >
                        {e.name}
                      </button>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleSkipPartner}
            className="mt-4 w-full py-3 rounded-xl border border-amber-200/60 bg-[var(--surface)] font-medium hover:bg-amber-50"
          >
            No partner
          </button>
        </div>
      )}

      {/* Step: Add note (optional) */}
      {step === "note" && (
        <div>
          <p className="text-[var(--muted)] mb-4">
            Add a note? (optional)
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Decorated with fresh strawberries..."
            className="w-full min-h-[100px] rounded-xl border border-amber-200/60 bg-[var(--surface)] px-3 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)]"
            autoFocus
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSkipNote}
              className="flex-1 py-3 rounded-xl border border-amber-200/60 bg-[var(--surface)] font-medium hover:bg-amber-50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSubmitNote}
              className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60">
          <p className="text-lg font-medium text-[var(--accent)]">Logged</p>
          <p className="mt-2 text-[var(--muted)]">
            {selectedEmployee?.name} – {selectedProduct?.name}
          </p>
          <p className="mt-1">
            Duration: <strong>{durationHms}</strong>
            {partner && (
              <span className="text-[var(--muted)]"> · with {partner.name}</span>
            )}
          </p>
          {savedNote && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Note: {savedNote}
            </p>
          )}
          {saving && <p className="mt-2 text-sm text-[var(--muted)]">Saving…</p>}
          {!saving && dbSaved === true && (
            <p className="mt-2 text-sm font-medium text-green-600">Saved to database ✓</p>
          )}
          {!saving && dbSaved === false && (
            <p className="mt-2 text-sm text-amber-700">Saved locally only. See error above.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="py-3 px-6 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90"
            >
              Log another
            </button>
            <Link
              href="/work-logs"
              className="py-3 px-6 rounded-xl border border-amber-200/60 bg-[var(--surface)] font-medium hover:bg-amber-50"
            >
              View all work history →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
