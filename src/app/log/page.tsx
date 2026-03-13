"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";
import type { Employee } from "@/types/database";

type Step = "employee" | "product" | "timer" | "partner" | "done";

const EMPLOYEE_KEY = "cake-workshop-selected-employee-id";

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
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [pRes, eRes] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("employees").select("*").order("name"),
      ]);
      if (pRes.data) setProducts(pRes.data);
      if (eRes.data) setEmployees(eRes.data);
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

  function handleSelectEmployee(id: string) {
    setSelectedEmployeeId(id);
    setStep("product");
  }

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    setStartTime(new Date());
    setStep("timer");
  }

  function handleEndWork() {
    setEndTime(new Date());
    setStep("partner");
  }

  function handleSkipPartner() {
    setStep("done");
    saveLog(null);
  }

  function handleSelectPartner(id: string) {
    setPartnerId(id);
    setStep("done");
    saveLog(id);
  }

  async function saveLog(partnerIdValue?: string | null) {
    if (!selectedEmployeeId || !selectedProductId || !startTime || !endTime) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("work_logs").insert({
      product_id: selectedProductId,
      employee_id: selectedEmployeeId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      partner_id: partnerIdValue ?? partnerId ?? null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
  }

  function reset() {
    setStep("employee");
    setSelectedProductId(null);
    setPartnerId(null);
    setStartTime(null);
    setEndTime(null);
    setError(null);
  }

  const durationMs = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationMins = Math.round(durationMs / 60000);

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
        Log work
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step: Choose employee */}
      {step === "employee" && (
        <div>
          <p className="text-[var(--muted)] mb-4">Who is working?</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {employees.map((e) => (
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
        </div>
      )}

      {/* Step: Choose product */}
      {step === "product" && (
        <div>
          <p className="text-[var(--muted)] mb-2">
            Logging as <strong className="text-[var(--foreground)]">{selectedEmployee?.name}</strong>
          </p>
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
        </div>
      )}

      {/* Step: Timer (started) */}
      {step === "timer" && (
        <div>
          <p className="text-[var(--muted)] mb-2">
            <strong className="text-[var(--foreground)]">{selectedEmployee?.name}</strong> → {selectedProduct?.name}
          </p>
          <p className="text-sm text-[var(--muted)] mb-4">
            Started at {startTime?.toLocaleTimeString()}
          </p>
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60 text-center">
            <p className="text-3xl font-semibold text-[var(--accent)]">
              {startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000)} min
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">elapsed</p>
          </div>
          <button
            type="button"
            onClick={handleEndWork}
            className="mt-6 w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            End work
          </button>
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
          <ul className="grid gap-2 sm:grid-cols-2">
            {employees
              .filter((e) => e.id !== selectedEmployeeId)
              .map((e) => (
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
          <button
            type="button"
            onClick={handleSkipPartner}
            className="mt-4 w-full py-3 rounded-xl border border-amber-200/60 bg-[var(--surface)] font-medium hover:bg-amber-50"
          >
            No partner
          </button>
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
            Duration: <strong>{durationMins} min</strong>
            {partner && (
              <span className="text-[var(--muted)]"> · with {partner.name}</span>
            )}
          </p>
          {saving && <p className="mt-2 text-sm text-[var(--muted)]">Saving…</p>}
          <button
            type="button"
            onClick={reset}
            className="mt-6 w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90"
          >
            Log another
          </button>
        </div>
      )}
    </div>
  );
}
