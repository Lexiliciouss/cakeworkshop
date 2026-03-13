import { supabase } from "@/lib/supabase";
import type { Employee } from "@/types/database";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeList } from "./EmployeeList";

export const dynamic = "force-dynamic";

async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export default async function EmployeesPage() {
  let employees: Employee[] = [];
  let error: string | null = null;

  try {
    employees = await getEmployees();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load employees";
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
        Employees
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <EmployeeForm />

      <EmployeeList employees={employees} />
    </div>
  );
}
