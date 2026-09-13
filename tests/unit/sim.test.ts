import { it, expect } from 'vitest';
import { MockProvider } from '@/lib/llm/provider';
import { MemorySimStore, SimEngine, publicPersona } from '@/lib/sim/engine';
import { finalizeGrade, mockGrade } from '@/lib/sim/grader';
import { gradeSchema, type Persona } from '@/lib/sim/schema';
import { territoryPolicy } from '@/lib/sim/policy';
const persona: Persona = {
  slug: 'fixture',
  name: 'Fixture',
  tier: 'warm',
  market: 'Test',
  primary_objection: 'Think about it',
  secondary_objection: null,
  trust_unlock: 'Use of space',
  spouse_status: 'Present',
  same_day_close_condition: 'Scope understood',
  competitor_quote: null,
  triggers: [
    { after_turn: 2, line: 'Think about it' },
    { after_turn: 4, line: 'Why this material?' },
    { after_turn: 6, line: 'Next steps?' },
  ],
  scenarios: [
    {
      id: 'test',
      title: 'Backyard',
      territory: 'default',
      project: 'Turf',
      size: '400 sqft',
      opening: 'Hello',
      hidden_budget: '$8,000',
      priority: 'Dogs',
      constraint: 'Drainage',
    },
  ],
};
const messages = [
  {
    role: 'user' as const,
    content: 'Our installation and warranty support the complete proposal.',
  },
];
it('sim: enforces 40-turn cap and logs each response and grade', async () => {
  const store = new MemorySimStore(),
    engine = new SimEngine(store, new MockProvider());
  const run = await engine.start('a', persona, 'test');
  for (let i = 0; i < 40; i++)
    await engine.send('a', run.id, 'What matters to you?');
  await expect(engine.send('a', run.id, '41')).rejects.toThrow('40-turn');
  await engine.end('a', run.id);
  await engine.end('a', run.id);
  const saved = await store.get('a', run.id);
  expect(saved.costs).toHaveLength(41);
  expect(
    gradeSchema.safeParse({ ...saved.grade, total_score: undefined }).success,
  ).toBe(false);
  expect(saved.grade?.fixes).toHaveLength(3);
});
it('sim: rejects 11th daily run atomically, permits next UTC day', async () => {
  const e = new SimEngine(new MemorySimStore(), new MockProvider());
  const results = await Promise.allSettled(
    Array.from({ length: 11 }, () =>
      e.start('a', persona, 'test', new Date('2026-09-13T10:00Z')),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  await expect(
    e.start('a', persona, 'test', new Date('2026-09-14T00:00Z')),
  ).resolves.toBeDefined();
});
it('sim: grade JSON validates; pass fixture', () => {
  const raw = mockGrade(messages);
  expect(gradeSchema.safeParse(raw).success).toBe(true);
  expect(finalizeGrade(raw).passed).toBe(true);
});
it('sim: >=75 with a dimension below half fails', () => {
  const raw = mockGrade(messages);
  raw.dimensions.rapport.score = 4;
  const grade = finalizeGrade(raw);
  expect(grade.total_score).toBe(76);
  expect(grade.passed).toBe(false);
});
it('sim: total below 75 fails', () => {
  const raw = mockGrade(messages);
  raw.dimensions.education.score = 10;
  expect(finalizeGrade(raw).passed).toBe(false);
});
it('sim: early drop caps close below half and fails regardless of claimed pass', () => {
  const raw = mockGrade(messages);
  raw.early_drop = true;
  const grade = finalizeGrade(raw);
  expect(grade.dimensions.close.score).toBe(9);
  expect(grade.passed).toBe(false);
});
it('sim: forged quotations and ownership fail; hidden brief omitted', async () => {
  const raw = mockGrade(messages);
  raw.fixes[0].quote = 'Invented';
  expect(() => finalizeGrade(raw, messages)).toThrow('quotes');
  const store = new MemorySimStore();
  const run = await new SimEngine(store, new MockProvider()).start(
    'a',
    persona,
    'test',
  );
  await expect(store.get('b', run.id)).rejects.toThrow('not found');
  expect(JSON.stringify(publicPersona(persona))).not.toContain('8,000');
});
it('sim: territorial drop cap can change independently of default', () => {
  expect(
    territoryPolicy('test', {
      version: 1,
      default: { max_same_day_drop_percent: 10, turf_base: 'chat' },
      areas: {
        test: {
          max_same_day_drop_percent: 7,
          turf_base: 'crushed granite breeze',
        },
      },
    }).max_same_day_drop_percent,
  ).toBe(7);
  expect(territoryPolicy('unconfigured').max_same_day_drop_percent).toBe(10);
});
