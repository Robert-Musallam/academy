import { it, expect } from 'vitest';
import { loadPersonas } from '@/lib/sim/personas';
import { publicPersona } from '@/lib/sim/engine';
it('six persona sheets with 18 distinct scenarios, balanced tiers and no public hidden brief', () => {
  const personas = loadPersonas();
  expect(personas).toHaveLength(6);
  for (const tier of ['warm', 'standard', 'hard'])
    expect(personas.filter((p) => p.tier === tier)).toHaveLength(2);
  expect(personas.flatMap((p) => p.scenarios)).toHaveLength(18);
  for (const p of personas) {
    expect(p.triggers).toHaveLength(3);
    const publicJSON = JSON.stringify(publicPersona(p));
    expect(publicJSON).not.toContain(p.trust_unlock);
    for (const s of p.scenarios)
      expect(publicJSON).not.toContain(s.hidden_budget);
  }
});
