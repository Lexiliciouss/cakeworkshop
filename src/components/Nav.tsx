"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/log", label: "Log Work" },
  { href: "/products", label: "Products" },
  { href: "/employees", label: "Employees" },
  { href: "/report", label: "Report" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-amber-200/60 bg-[var(--surface)] sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-semibold text-[var(--accent)] mr-4">Cake Workshop</span>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === href
                ? "bg-amber-100 text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-amber-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
