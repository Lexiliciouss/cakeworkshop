import Link from "next/link";

export default function Home() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
        Production tracking
      </h1>
      <p className="text-[var(--muted)] mb-8">
        Record who worked on which product and how long. Use this for labor cost analysis.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/log"
          className="block p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60 hover:border-[var(--accent-light)] hover:shadow-md transition-all"
        >
          <span className="text-[var(--accent)] font-semibold">Log work</span>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Select your name, product, then start and end time.
          </p>
        </Link>
        <Link
          href="/report"
          className="block p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60 hover:border-[var(--accent-light)] hover:shadow-md transition-all"
        >
          <span className="text-[var(--accent)] font-semibold">Daily report</span>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Total hours per employee, average time per product.
          </p>
        </Link>
        <Link
          href="/products"
          className="block p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60 hover:border-[var(--accent-light)] hover:shadow-md transition-all"
        >
          <span className="text-[var(--accent)] font-semibold">Products</span>
          <p className="mt-1 text-sm text-[var(--muted)]">
            View and manage products and categories.
          </p>
        </Link>
        <Link
          href="/employees"
          className="block p-6 rounded-xl bg-[var(--surface)] border border-amber-200/60 hover:border-[var(--accent-light)] hover:shadow-md transition-all"
        >
          <span className="text-[var(--accent)] font-semibold">Employees</span>
          <p className="mt-1 text-sm text-[var(--muted)]">
            View team members and their skills.
          </p>
        </Link>
      </div>
    </div>
  );
}
