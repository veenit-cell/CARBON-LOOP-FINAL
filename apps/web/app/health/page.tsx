import { appEnvironment } from "@/lib/env";

export default function HealthPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section aria-labelledby="health-title">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">
          CarbonLoop
        </p>
        <h1
          id="health-title"
          className="mt-2 text-4xl font-bold tracking-tight"
        >
          Application healthy
        </h1>
        <p className="mt-4 text-slate-700">
          Repository foundation is running in {appEnvironment} mode.
        </p>
      </section>
    </main>
  );
}
