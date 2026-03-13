"use server";

import { supabase } from "@/lib/supabase";
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

  const { error } = await supabase.from("employees").insert({
    name: name.trim(),
    role,
    skills: skillsArray,
    hourly_rate: hourlyRate,
  });

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
