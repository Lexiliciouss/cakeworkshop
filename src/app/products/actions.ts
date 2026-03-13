"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const standardMinutes = parseFloat(
    (formData.get("standard_minutes") as string) || "0"
  ) || 0;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }
  if (!category?.trim()) {
    return { error: "Category is required" };
  }

  const { error } = await supabase
    .from("products")
    .insert([{ name: name.trim(), category: category.trim(), standard_minutes: standardMinutes }] as any);

  if (error) return { error: error.message };
  revalidatePath("/products");
  return { error: null };
}

export async function createProductAction(
  _prev: { error: string | null } | null,
  formData: FormData
) {
  return createProduct(formData);
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/products");
  return { error: null };
}
