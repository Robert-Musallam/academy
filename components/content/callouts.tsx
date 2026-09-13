import type { ReactNode } from 'react';

export function PhrasesToUse({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 rounded border-l-4 border-emerald-700 bg-emerald-50 p-5">
      <h2 className="mb-2 font-bold">Phrases to use</h2>
      {children}
    </aside>
  );
}
export function WhyItMatters({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 rounded border-l-4 border-amber-500 bg-amber-50 p-5">
      <h2 className="mb-2 font-bold">Why it matters</h2>
      {children}
    </aside>
  );
}
