"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { createProductAction } from "./actions";

const DEFAULT_CATEGORIES = ["Cakes", "Drinks", "Pastries"];
const CATEGORIES_KEY = "cake-workshop-categories-list";

function loadList(key: string, defaults: string[]): string[] {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveList(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}

export function ProductForm() {
  const [state, formAction] = useActionState(createProductAction, { error: null });
  const [categoryList, setCategoryList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategoryList(loadList(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addCategory() {
    const v = newCategory.trim();
    if (!v || categoryList.includes(v)) return;
    const next = [...categoryList, v];
    setCategoryList(next);
    saveList(CATEGORIES_KEY, next);
    setNewCategory("");
  }

  function requestRemoveCategory(cat: string) {
    setConfirmDelete(cat);
  }

  function removeCategory(cat: string) {
    setCategoryList((prev) => {
      const next = prev.filter((c) => c !== cat);
      saveList(CATEGORIES_KEY, next);
      return next;
    });
    if (selectedCategory === cat) setSelectedCategory(null);
    setConfirmDelete(null);
  }

  return (
    <>
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="rounded-xl bg-white p-6 shadow-xl max-w-sm w-full border border-amber-200/60"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--foreground)] font-medium">
              Remove &quot;{confirmDelete}&quot; from categories list?
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-amber-200/60 bg-white font-medium hover:bg-amber-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeCategory(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      <form
        action={formAction}
        className="mb-8 p-6 rounded-xl border border-amber-200/60 bg-[var(--surface)]"
      >
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">
          Add product
        </h2>
        {state?.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {state.error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="prod-name"
              className="block text-sm font-medium text-[var(--muted)] mb-1"
            >
              Name *
            </label>
            <input
              id="prod-name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
              placeholder="e.g. Strawberry Cake"
            />
          </div>
          <div ref={categoryRef} className="relative">
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Category *
            </label>
            <input type="hidden" name="category" value={selectedCategory ?? ""} />
            <div
              role="combobox"
              aria-expanded={categoryOpen}
              tabIndex={0}
              onClick={() => setCategoryOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.preventDefault();
              }}
              className="min-h-[42px] w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 cursor-pointer flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0"
            >
              {!selectedCategory ? (
                <span className="text-[var(--muted)]">Select category...</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm text-[var(--foreground)]">
                  {selectedCategory}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory(null);
                    }}
                    className="hover:bg-amber-200/60 rounded-full p-0.5 leading-none"
                    aria-label="Clear category"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
            {categoryOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-amber-200/60 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
                {categoryList.map((cat) => (
                  <div
                    key={cat}
                    className="group flex items-center justify-between px-3 py-2 hover:bg-amber-50"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedCategory(cat);
                      }}
                      className={`flex-1 text-left text-sm ${selectedCategory === cat ? "font-medium" : ""}`}
                    >
                      {cat}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestRemoveCategory(cat);
                      }}
                      className="p-1 rounded hover:bg-amber-200/60 text-[var(--muted)] hover:text-red-600 shrink-0"
                      aria-label={`Remove ${cat} from list`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="border-t border-amber-100 mt-1 pt-1 px-2 flex gap-1">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                    placeholder="Add new category..."
                    className="flex-1 rounded border border-amber-200/60 px-2 py-1.5 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addCategory();
                    }}
                    className="px-2 py-1.5 rounded bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="prod-minutes"
              className="block text-sm font-medium text-[var(--muted)] mb-1"
            >
              Standard minutes
            </label>
            <input
              id="prod-minutes"
              name="standard_minutes"
              type="number"
              step="0.5"
              min="0"
              defaultValue="0"
              className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
              placeholder="0"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!selectedCategory}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add product
        </button>
      </form>
    </>
  );
}
