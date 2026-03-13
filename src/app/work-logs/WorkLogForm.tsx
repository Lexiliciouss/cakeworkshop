"use client";

import { useActionState } from "react";
import { createWorkLogAction } from "./actions";

type Employee = { id: string; name: string };
type Product = { id: string; name: string; category: string };

export function WorkLogForm({
  employees,
  products,
}: {
  employees: Employee[];
  products: Product[];
}) {
  const [state, formAction] = useActionState(createWorkLogAction, {
    error: null,
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => {
      payload[k] = String(v);
    });
    console.log("[work_logs form] Submitting payload:", payload);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="mb-8 p-6 rounded-xl border border-amber-200/60 bg-[var(--surface)]"
    >
      <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">
        Add work history
      </h2>
      {state?.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          <strong>Supabase error:</strong> {state.error}
          <br />
          <span className="text-xs opacity-80">Check the console for details.</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor="wl-employee"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Employee *
          </label>
          <select
            id="wl-employee"
            name="employee_id"
            required
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          >
            <option value="">Select…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="wl-product"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Product *
          </label>
          <select
            id="wl-product"
            name="product_id"
            required
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          >
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="wl-partner"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Partner (optional)
          </label>
          <select
            id="wl-partner"
            name="partner_employee_id"
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          >
            <option value="">None</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="wl-date"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Work date *
          </label>
          <input
            id="wl-date"
            name="work_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label
            htmlFor="wl-start"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Start time *
          </label>
          <input
            id="wl-start"
            name="start_time"
            type="time"
            required
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label
            htmlFor="wl-end"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            End time *
          </label>
          <input
            id="wl-end"
            name="end_time"
            type="time"
            required
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div>
          <label
            htmlFor="wl-quantity"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Quantity
          </label>
          <input
            id="wl-quantity"
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="wl-notes"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Notes
          </label>
          <input
            id="wl-notes"
            name="notes"
            type="text"
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
            placeholder="Optional notes"
          />
        </div>
      </div>
      <button
        type="submit"
        className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90"
      >
        Add work history
      </button>
    </form>
  );
}
