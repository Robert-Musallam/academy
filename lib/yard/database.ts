import 'server-only';
import { rpc, rows } from '@/lib/training/db';
import type { Roster } from '@/lib/training/types';
import { DatabaseSimStore } from '@/lib/sim/database';
import { SimEngine, publicRun } from '@/lib/sim/engine';
import { configuredProvider } from '@/lib/llm/provider';
import { personaSchema } from '@/lib/sim/schema';
import { territoryPolicy } from '@/lib/sim/policy';
import {
  yard,
  initialDesign,
  assessField,
  polygonArea,
  layoutChecks,
  type FieldEvidence,
  type FieldAnswers,
} from './model';
import type { z } from 'zod';
import { yardActionSchema } from './schema';
type Saved = {
  runId: string;
  evidence: FieldEvidence;
  answers?: FieldAnswers;
  result?: ReturnType<typeof assessField>;
};
export async function savedYard(
  member: Roster,
  input?: z.infer<typeof yardActionSchema>,
) {
  const raw = (
    await rows<{ brief: unknown }>('personas', {
      tenant_id: member.tenant_id,
      track_id: member.track_id,
      slug: 'maya-and-dan',
    })
  )[0];
  if (!raw) throw new Error('This field lab is not available for your track');
  const persona = personaSchema.parse(raw.brief),
    scenario = {
      ...persona.scenarios[0],
      id: yard.id,
      title: yard.name,
      size: `${polygonArea(yard.turf)} sqft irregular lawn`,
      opening:
        'Hi, I’m Maya. We want a backyard that works better for our family and the dogs.',
      constraint:
        'Water gathers near the house. Keep the tree and the path from the back door clear.',
    };
  const saved = await rpc<Saved>('academy_yard_open', {
    p_owner: member.id,
    p_initial: {
      evidence: {
        observed: [],
        trace: [],
        stations: [],
        layers: [],
        design: initialDesign,
      },
      runState: {
        persona: { ...persona, scenarios: [scenario] },
        scenario,
        policy: territoryPolicy('default'),
        messages: [{ role: 'assistant', content: scenario.opening }],
        turns: 0,
        status: 'active',
        costs: [],
      },
    },
  });
  const store = new DatabaseSimStore();
  if (input) {
    if (JSON.stringify(saved.evidence) !== JSON.stringify(input.evidence))
      delete saved.result;
    saved.evidence = input.evidence;
    if (input.action === 'assess') {
      saved.answers = input.answers;
      saved.result = assessField(input.evidence, input.answers);
    }
    if (input.action === 'chat') {
      const e = input.evidence;
      await new SimEngine(store, configuredProvider()).send(
        member.id,
        saved.runId,
        input.text,
        {
          observations: e.observed,
          measuredArea: e.trace.length >= 3 ? polygonArea(e.trace) : null,
          turf: e.design.turf,
          pavers: e.design.pavers,
          doorwayClear: layoutChecks(e.design).doorwayClear,
          base: e.design.base,
        },
      );
    }
    await rpc('academy_yard_save', { p_owner: member.id, p_snapshot: saved });
  }
  return {
    evidence: saved.evidence,
    answers: saved.answers,
    result: saved.result,
    run: publicRun(await store.get(member.id, saved.runId)),
  };
}
