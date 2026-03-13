import { supabase } from "@/lib/supabase";
import type { Employee } from "@/types/database";

async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
        Employees
      </h1>

      {employees.length === 0 ? (
        <p className="text-[var(--muted)]">No employees yet. Add them in Supabase or run seed.</p>
      ) : (
        <ul className="rounded-xl border border-amber-200/60 bg-[var(--surface)] overflow-hidden divide-y divide-amber-100">
          {employees.map((e) => (
            <li key={e.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="font-medium">{e.name}</span>
              {e.skills ? (
                <span className="text-sm text-[var(--muted)]">{e.skills}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
