import { DISTRICTS } from '@crisislink/shared';
import { ApiStatus } from './components/ApiStatus';

export function App() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">
            Crisis<span className="text-red-600">Link</span>
          </h1>
          <ApiStatus />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Disaster relief coordination for Kerala
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Phase 0 foundation: TypeScript monorepo with a React frontend, an Express API and shared
          types. Camps, evacuees, volunteers and donations arrive in the next phases.
        </p>

        <section className="mt-10" aria-labelledby="districts-heading">
          <h3 id="districts-heading" className="text-lg font-semibold">
            Districts ({DISTRICTS.length})
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {DISTRICTS.map((district) => (
              <li
                key={district.slug}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm"
              >
                {district.name}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
