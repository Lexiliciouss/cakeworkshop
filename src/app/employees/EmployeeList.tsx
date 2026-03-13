"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEmployee } from "./actions";
import type { Employee } from "@/types/database";

export function EmployeeList({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const result = await deleteEmployee(confirmDelete.id);
    setConfirmDelete(null);
    setDeleting(false);
    if (!result?.error) router.refresh();
  }

  return (
    <>
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
              Delete employee &quot;{confirmDelete.name}&quot;?
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This cannot be undone.
            </p>
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
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden">
        {employees.length === 0 ? (
          <div className="px-4 py-6 text-[var(--muted)]">
            No employees yet. Add one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-100 text-xs font-medium uppercase tracking-wide text-[var(--muted)] text-left">
                <th className="px-4 py-3 w-[20%]">Name</th>
                <th className="px-4 py-3 w-[15%]">Role</th>
                <th className="px-4 py-3 min-w-0">Skills</th>
                <th className="px-4 py-3 w-[12%] text-right">Hourly rate ($)</th>
                <th className="px-4 py-3 w-[8%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{e.role || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)] min-w-0">
                    {Array.isArray(e.skills)
                      ? (e.skills as string[]).join(", ")
                      : (e.skills || "—")}
                  </td>
                  <td className="px-4 py-3 text-right">${Number(e.hourly_rate ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(e)}
                      className="p-1.5 rounded text-[var(--muted)] hover:text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${e.name}`}
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
        )}
      </div>
    </>
  );
}
