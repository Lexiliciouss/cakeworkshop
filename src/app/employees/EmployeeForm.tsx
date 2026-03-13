"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { createEmployeeAction } from "./actions";

const DEFAULT_SKILLS = ["Strawberry Cake", "Mango Cake", "Melon Cake", "Assistant", "Decorating"];
const DEFAULT_ROLES = ["Baker", "Cake chef", "Trainee", "Trainee cake chef", "Decorator"];
const SKILLS_KEY = "cake-workshop-skills-list";
const ROLES_KEY = "cake-workshop-roles-list";

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

export function EmployeeForm() {
  const [state, formAction] = useActionState(createEmployeeAction, { error: null });
  const [skillList, setSkillList] = useState<string[]>(DEFAULT_SKILLS);
  const [roleList, setRoleList] = useState<string[]>(DEFAULT_ROLES);

  useEffect(() => {
    setSkillList(loadList(SKILLS_KEY, DEFAULT_SKILLS));
    setRoleList(loadList(ROLES_KEY, DEFAULT_ROLES));
  }, []);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newRole, setNewRole] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "skill" | "role"; value: string } | null>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (skillsRef.current && !skillsRef.current.contains(e.target as Node)) setSkillsOpen(false);
      if (rolesRef.current && !rolesRef.current.contains(e.target as Node)) setRolesOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function addSkill() {
    const v = newSkill.trim();
    if (!v || skillList.includes(v)) return;
    const next = [...skillList, v];
    setSkillList(next);
    saveList(SKILLS_KEY, next);
    setNewSkill("");
  }

  function requestRemoveSkill(skill: string) {
    setConfirmDelete({ type: "skill", value: skill });
  }

  function removeSkill(skill: string) {
    setSkillList((prev) => {
      const next = prev.filter((s) => s !== skill);
      saveList(SKILLS_KEY, next);
      return next;
    });
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
    setConfirmDelete(null);
  }

  function addRole() {
    const v = newRole.trim();
    if (!v || roleList.includes(v)) return;
    const next = [...roleList, v];
    setRoleList(next);
    saveList(ROLES_KEY, next);
    setNewRole("");
  }

  function requestRemoveRole(role: string) {
    setConfirmDelete({ type: "role", value: role });
  }

  function removeRole(role: string) {
    setRoleList((prev) => {
      const next = prev.filter((r) => r !== role);
      saveList(ROLES_KEY, next);
      return next;
    });
    setSelectedRoles((prev) => prev.filter((r) => r !== role));
    setConfirmDelete(null);
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.type === "skill") removeSkill(confirmDelete.value);
    else removeRole(confirmDelete.value);
  }

  return (
    <>
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div
            className="rounded-xl bg-white p-6 shadow-xl max-w-sm w-full border border-amber-200/60"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--foreground)] font-medium">
              Remove &quot;{confirmDelete.value}&quot; from {confirmDelete.type}s list?
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
                onClick={handleConfirmDelete}
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
        Add employee
      </h2>
      {state?.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {state.error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="emp-name"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Name *
          </label>
          <input
            id="emp-name"
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
            placeholder="e.g. Maria"
          />
        </div>
        <div ref={rolesRef} className="relative">
          <label className="block text-sm font-medium text-[var(--muted)] mb-1">
            Role
          </label>
          {selectedRoles.map((r) => (
            <input key={r} type="hidden" name="role" value={r} />
          ))}
          <div
            role="combobox"
            aria-expanded={rolesOpen}
            tabIndex={0}
            onClick={() => setRolesOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.preventDefault();
            }}
            className="min-h-[42px] w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 cursor-pointer flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0"
          >
            {selectedRoles.length === 0 ? (
              <span className="text-[var(--muted)]">Select role...</span>
            ) : (
              selectedRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm text-[var(--foreground)]"
                >
                  {role}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRole(role);
                    }}
                    className="hover:bg-amber-200/60 rounded-full p-0.5 leading-none"
                    aria-label={`Remove ${role}`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                </span>
              ))
            )}
          </div>
          {rolesOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-amber-200/60 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
              {roleList.map((role) => (
                <div
                  key={role}
                  className="group flex items-center justify-between px-3 py-2 hover:bg-amber-50"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleRole(role);
                    }}
                    className={`flex-1 text-left text-sm ${selectedRoles.includes(role) ? "font-medium" : ""}`}
                  >
                    {role}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      requestRemoveRole(role);
                    }}
                    className="p-1 rounded hover:bg-amber-200/60 text-[var(--muted)] hover:text-red-600 shrink-0"
                    aria-label={`Remove ${role} from list`}
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
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                  placeholder="Add new role..."
                  className="flex-1 rounded border border-amber-200/60 px-2 py-1.5 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); addRole(); }}
                  className="px-2 py-1.5 rounded bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
        <div ref={skillsRef} className="relative">
          <label className="block text-sm font-medium text-[var(--muted)] mb-1">
            Skills
          </label>
          {selectedSkills.map((s) => (
            <input key={s} type="hidden" name="skills" value={s} />
          ))}
          <div
            role="combobox"
            aria-expanded={skillsOpen}
            tabIndex={0}
            onClick={() => setSkillsOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.preventDefault();
            }}
            className="min-h-[42px] w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 cursor-pointer flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0"
          >
            {selectedSkills.length === 0 ? (
              <span className="text-[var(--muted)]">Select skills...</span>
            ) : (
              selectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm text-[var(--foreground)]"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSkill(skill);
                    }}
                    className="hover:bg-amber-200/60 rounded-full p-0.5 leading-none"
                    aria-label={`Remove ${skill}`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                </span>
              ))
            )}
          </div>
          {skillsOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-amber-200/60 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
              {skillList.map((skill) => (
                <div
                  key={skill}
                  className="group flex items-center justify-between px-3 py-2 hover:bg-amber-50"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSkill(skill);
                    }}
                    className={`flex-1 text-left text-sm ${selectedSkills.includes(skill) ? "font-medium" : ""}`}
                  >
                    {skill}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      requestRemoveSkill(skill);
                    }}
                    className="p-1 rounded hover:bg-amber-200/60 text-[var(--muted)] hover:text-red-600 shrink-0"
                    aria-label={`Remove ${skill} from list`}
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
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Add new skill..."
                  className="flex-1 rounded border border-amber-200/60 px-2 py-1.5 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); addSkill(); }}
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
            htmlFor="emp-hourly"
            className="block text-sm font-medium text-[var(--muted)] mb-1"
          >
            Hourly rate ($)
          </label>
          <input
            id="emp-hourly"
            name="hourly_rate"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="w-full rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-[var(--foreground)]"
            placeholder="0.00"
          />
        </div>
      </div>
      <button
        type="submit"
        className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90"
      >
        Add employee
      </button>
    </form>
    </>
  );
}
