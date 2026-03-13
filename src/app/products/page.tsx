import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";

async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export default async function ProductsPage() {
  const products = await getProducts();

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
        Products
      </h1>

      {products.length === 0 ? (
        <p className="text-[var(--muted)]">No products yet. Add them in Supabase or run seed.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                {category}
              </h2>
              <ul className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden divide-y divide-amber-100">
                {items.map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-3 flex justify-between items-center"
                  >
                    <span className="font-medium">{p.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
