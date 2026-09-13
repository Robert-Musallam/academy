import 'server-only';
import { randomUUID } from 'node:crypto';
import { MemorySimStore, SimEngine, publicRun } from '@/lib/sim/engine';
import { territoryPolicy } from '@/lib/sim/policy';
import { MockProvider } from '@/lib/llm/provider';
import { loadPersonas } from '@/lib/sim/personas';
import {
  yard,
  assessField,
  initialDesign,
  polygonArea,
  layoutChecks,
  type FieldEvidence,
  type FieldAnswers,
} from './model';
import type { YardContext } from '@/lib/llm/provider';
type Session = {
  owner: string;
  created: number;
  store: MemorySimStore;
  engine: SimEngine;
  runId?: string;
  evidence: FieldEvidence;
  result?: ReturnType<typeof assessField>;
  answers?: FieldAnswers;
};
const holder = globalThis as typeof globalThis & {
  academyYards?: Map<string, Session>;
};
const sessions: Map<string, Session> = (holder.academyYards ??= new Map<
  string,
  Session
>());
export function getYardSession(cookie?: string) {
  for (const [id, s] of sessions)
    if (Date.now() - s.created > 86400000) sessions.delete(id);
  if (cookie && sessions.has(cookie)) return sessions.get(cookie)!;
  if (sessions.size >= 200) throw new Error('Preview capacity reached');
  const store = new MemorySimStore(),
    owner = randomUUID();
  const session: Session = {
    owner,
    created: Date.now(),
    store,
    engine: new SimEngine(store, new MockProvider()),
    evidence: {
      observed: [],
      trace: [],
      stations: [],
      layers: [],
      design: structuredClone(initialDesign),
    },
  };
  sessions.set(owner, session);
  return session;
}
export async function ensureYardRun(s: Session) {
  if (!s.runId) {
    // This cookie-scoped practice run is created before the session is returned to the browser.
    const persona = loadPersonas().find((p) => p.slug === 'maya-and-dan')!;
    const scenario = {
      ...persona.scenarios[0],
      id: yard.id,
      title: yard.name,
      size: `${polygonArea(yard.turf)} sqft irregular lawn`,
      opening:
        'Hi, I’m Maya. Thanks for coming out. We would love a backyard that works better for our family and the dogs.',
      priority:
        'The dogs bring mud inside, and we want room to sit together outside.',
      constraint:
        'Water gathers near the back of the house. Keep the tree and an open path from the back door.',
    };
    const run = await s.store.start(
      s.owner,
      { ...persona, scenarios: [scenario] },
      scenario,
      {
        max_same_day_drop_percent:
          territoryPolicy('default').max_same_day_drop_percent,
        turf_base:
          'limestone chat or crushed granite breeze, approved for this synthetic training territory',
      },
      new Date().toISOString().slice(0, 10),
    );
    s.runId = run.id;
  }
  return s.runId;
}
function context(e: FieldEvidence): YardContext {
  return {
    observations: e.observed,
    measuredArea: e.trace.length >= 3 ? polygonArea(e.trace) : null,
    turf: e.design.turf,
    pavers: e.design.pavers,
    doorwayClear: layoutChecks(e.design).doorwayClear,
    base: e.design.base,
  };
}
export async function yardSnapshot(s: Session) {
  const id = await ensureYardRun(s);
  return {
    evidence: s.evidence,
    result: s.result,
    answers: s.answers,
    run: publicRun(await s.store.get(s.owner, id)),
  };
}
export async function yardChat(
  s: Session,
  text: string,
  evidence: FieldEvidence,
) {
  const id = await ensureYardRun(s);
  if (JSON.stringify(s.evidence) !== JSON.stringify(evidence))
    s.result = undefined;
  s.evidence = evidence;
  await s.engine.send(s.owner, id, text, context(evidence));
  return yardSnapshot(s);
}
export async function yardAssessment(
  s: Session,
  answers: FieldAnswers,
  evidence: FieldEvidence,
) {
  s.evidence = evidence;
  s.result = assessField(evidence, answers);
  s.answers = answers;
  return yardSnapshot(s);
}
