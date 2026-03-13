"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "./actions";
import type { Product } from "@/types/database";

export function ProductList({ products }: { products: Product[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteProduct(confirmDelete.id);
    if (result?.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    setConfirmDelete(null);
    setDeleting(false);
    router.refresh();
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
              Delete product &quot;{confirmDelete.name}&quot;?
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
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
      {products.length === 0 ? (
        <p className="text-[var(--muted)]">No products yet. Add one above.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                {category}
              </h2>

              <div className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden">
                <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-amber-100 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-2 text-right">Std minutes</div>
                  <div className="col-span-2"></div>
                </div>

                <ul className="divide-y divide-amber-100">
                  {items.map((p) => (
                    <li key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                      <div className="col-span-5 font-medium">{p.name}</div>
                      <div className="col-span-3 text-sm text-[var(--muted)]">
                        {p.category}
                      </div>
                      <div className="col-span-2 text-right text-sm">
                        {p.standard_minutes ?? 0}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(p)}
                          className="p-1.5 rounded text-[var(--muted)] hover:text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${p.name}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
