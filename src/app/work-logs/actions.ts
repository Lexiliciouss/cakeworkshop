"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toISOTimestamp(dateStr: string, timeStr: string): string {
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const dt = new Date(`${dateStr}T${time}`);
  return dt.toISOString();
}

/** Parse to number if numeric string, otherwise return trimmed string. Never return empty. */
function parseId(raw: FormDataEntryValue | null): number | string | null {
  const s = typeof raw === "string" ? raw.trim() : null;
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && String(n) === s) return n;
  return s;
}

export async function createWorkLog(formData: FormData) {
  // Log raw form data for debugging
  const raw: Record<string, string> = {};
  formData.forEach((v, k) => {
    raw[k] = typeof v === "string" ? v : "[File]";
  });
  console.log("[work_logs insert] Raw FormData:", raw);

  const employeeId = parseId(formData.get("employee_id"));
  const productId = parseId(formData.get("product_id"));
  const partnerRaw = (formData.get("partner_employee_id") as string)?.trim();
  const partnerEmployeeId = partnerRaw && partnerRaw !== "" ? parseId(partnerRaw) ?? partnerRaw : null;
  const workDate = (formData.get("work_date") as string)?.trim();
  const startTime = (formData.get("start_time") as string)?.trim();
  const endTime = (formData.get("end_time") as string)?.trim();
  const quantity = parseInt(String(formData.get("quantity") || "1"), 10) || 1;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (employeeId === null || employeeId === "")
    return { error: "Employee is required (received empty or invalid)" };
  if (productId === null || productId === "")
    return { error: "Product is required (received empty or invalid)" };
  if (!workDate) return { error: "Work date is required" };
  if (!startTime) return { error: "Start time is required" };
  if (!endTime) return { error: "End time is required" };

  const startISO = toISOTimestamp(workDate, startTime);
  const endISO = toISOTimestamp(workDate, endTime);

  if (new Date(endISO) <= new Date(startISO)) {
    return { error: "End time must be after start time" };
  }

  const row = {
    employee_id: employeeId,
    product_id: productId,
    partner_employee_id: partnerEmployeeId,
    work_date: workDate,
    start_time: startISO,
    end_time: endISO,
    quantity,
    notes,
  };

  console.log("[work_logs insert] Payload (snake_case):", JSON.stringify(row, null, 2));

  const { data, error } = await supabase
    .from("work_logs")
    .insert(row as never)
    .select("id, employee_id, product_id, partner_employee_id, work_date, start_time, end_time, quantity, notes")
    .single();

  if (error) {
    console.error("[work_logs insert] Supabase error:", error);
    return { error: error.message };
  }

  console.log("[work_logs insert] Verified saved row:", JSON.stringify(data, null, 2));
  if (data && (data.employee_id == null || data.product_id == null)) {
    console.warn("[work_logs insert] WARNING: Saved row has missing employee_id or product_id:", data);
  }

  revalidatePath("/work-logs");
  redirect("/work-logs?r=" + Date.now());
}

export async function createWorkLogAction(
  _prev: { error: string | null } | null,
  formData: FormData
) {
  return createWorkLog(formData);
}

export async function deleteWorkLog(id: string) {
  const { error } = await supabase.from("work_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/work-logs");
  return { error: null };
}
