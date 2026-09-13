import 'server-only';
import { randomUUID } from 'node:crypto';
import { MemorySimStore, SimEngine, publicRun, publicPersona } from './engine';
import { MockProvider } from '@/lib/llm/provider';
import { loadPersonas } from './personas';

// Isolated review data; no real roster, Supabase credential or training progress.
// The route is disabled in production and accepts only loopback-host requests.
const globalPreview = globalThis as typeof globalThis & {
  academySimPreview?: Map<
    string,
    { store: MemorySimStore; engine: SimEngine; ids: string[]; last: number }
  >;
};
const sessions: NonNullable<typeof globalPreview.academySimPreview> =
  (globalPreview.academySimPreview ??= new Map());
export function previewSession(id?: string) {
  const now = Date.now();
  for (const [key, value] of sessions)
    if (now - value.last > 24 * 60 * 60 * 1000) sessions.delete(key);
  const owner = id && sessions.has(id) ? id : randomUUID();
  if (!sessions.has(owner)) {
    if (sessions.size >= 200)
      throw new Error('Preview capacity reached; restart the local preview.');
    const store = new MemorySimStore();
    sessions.set(owner, {
      store,
      engine: new SimEngine(store, new MockProvider()),
      ids: [],
      last: now,
    });
  }
  const session = sessions.get(owner)!;
  session.last = now;
  return { owner, ...session };
}
export function previewCatalog() {
  return loadPersonas().map(publicPersona);
}
export async function previewHistory(id: string) {
  const s = previewSession(id);
  return Promise.all(
    s.ids.map(async (runId) => publicRun(await s.store.get(id, runId))),
  );
}
