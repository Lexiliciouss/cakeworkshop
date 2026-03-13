import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";
import { ProductForm } from "./ProductForm";
import { ProductList } from "./ProductList";

export const dynamic = "force-dynamic";

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
  let products: Product[] = [];
  let error: string | null = null;

  try {
    products = await getProducts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load products";
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
        Products
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <ProductForm />

      <ProductList products={products} />
    </div>
  );
}
