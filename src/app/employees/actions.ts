"use server";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createEmployee(formData: FormData) {
  const name = formData.get("name") as string;
  const roleValues = formData.getAll("role");
  const role = Array.isArray(roleValues)
    ? (roleValues as string[]).filter(Boolean).join(", ")
    : roleValues ? String(roleValues).trim() : "";
  const skillsValues = formData.getAll("skills");
  const skillsArray = Array.isArray(skillsValues)
    ? (skillsValues as string[]).filter(Boolean)
    : skillsValues
      ? [String(skillsValues).trim()]
      : [];
  const hourlyRate = parseFloat((formData.get("hourly_rate") as string) || "0") || 0;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  const insertRow: Database["public"]["Tables"]["employees"]["Insert"] = {
    name: name.trim(),
    role,
    skills: skillsArray.join(", "),
    hourly_rate: hourlyRate,
  };

  // Type assertion: manual Database type may not match Supabase's expected schema; insert resolves to `never`.
  // Regenerate with `supabase gen types typescript --project-id <id>` and replace @/types/database to fix.
  const { error } = await supabase.from("employees").insert([insertRow] as any);

  if (error) return { error: error.message };
  revalidatePath("/employees");
  return { error: null };
}

export async function createEmployeeAction(
  _prev: { error: string | null } | null,
  formData: FormData
) {
  return createEmployee(formData);
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/employees");
  return { error: null };
}
