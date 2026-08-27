import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section>
        <p className="text-sm font-semibold tracking-wide text-emerald-700">
          CarbonLoop
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Measure. Verify. Reduce.
        </h1>
        <p className="mt-4 text-slate-700">
          Repository foundation is ready. CarbonLoop business features have not
          been implemented yet.
        </p>
        <Link
          className="mt-6 inline-block font-medium text-emerald-700 underline"
          href="/health"
        >
          View application health
        </Link>
      </section>
    </main>
  );
}
