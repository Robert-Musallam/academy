import { it, expect } from 'vitest';
import {
  yard,
  polygonArea,
  isTurfBoundary,
  signedSlope,
  assessField,
  initialDesign,
  layoutChecks,
  type FieldEvidence,
  type Point,
} from '@/lib/yard/model';
import { yardActionSchema } from '@/lib/yard/schema';
import { MockProvider, type ChatInput } from '@/lib/llm/provider';
import { loadPersonas } from '@/lib/sim/personas';
const good: FieldEvidence = {
  observed: ['drainage', 'access', 'tree', 'bed'],
  trace: yard.turf,
  stations: ['S1', 'S2'],
  layers: ['turf:base', 'pavers:surface'],
  design: { ...initialDesign, turf: true },
};
const answers = {
  area: 736,
  order: 809.6,
  slope: 3,
  direction: 'toward-house' as const,
};
it('yard: geometry has the correct notch, plan area, and signed elevation fall', () => {
  expect(polygonArea(yard.turf)).toBe(736);
  expect(polygonArea([...yard.turf].reverse())).toBe(736);
  expect(
    signedSlope(yard.stations[0].point, yard.stations[1].point),
  ).toBeCloseTo(-3);
  expect(signedSlope([1, 1], [1, 1])).toBeNull();
});
it('yard: accepts any cyclic start and either direction, rejects equal-area wrong locations and crossed traces', () => {
  expect(
    isTurfBoundary([...yard.turf.slice(3), ...yard.turf.slice(0, 3)]),
  ).toBe(true);
  expect(isTurfBoundary([...yard.turf].reverse())).toBe(true);
  const shifted = yard.turf.map(([x, z]) => [x + 2, z] as Point);
  expect(polygonArea(shifted)).toBe(736);
  expect(isTurfBoundary(shifted)).toBe(false);
  expect(
    isTurfBoundary([
      yard.turf[0],
      yard.turf[2],
      yard.turf[1],
      ...yard.turf.slice(3),
    ]),
  ).toBe(false);
});
it('yard: completes only with evidence and correct calculations; numeric tolerance is inclusive', () => {
  expect(assessField(good, answers).score).toBe(100);
  for (const factor of [0.95, 1.05])
    expect(
      assessField(good, {
        ...answers,
        area: 736 * factor,
        order: 809.6 * factor,
        slope: 3 * factor,
      }).complete,
    ).toBe(true);
  expect(
    assessField({ ...good, trace: [], stations: [] }, answers).complete,
  ).toBe(false);
  expect(
    assessField(good, { ...answers, direction: 'away-house' }).checks.find(
      (c) => c.id === 'slope',
    )?.passed,
  ).toBe(false);
  expect(
    assessField(good, { ...answers, area: 816 }).checks.find(
      (c) => c.id === 'area',
    )?.passed,
  ).toBe(false);
});
it('yard: both approved bases work, sand and blocked door routes fail', () => {
  for (const base of ['limestone-chat', 'granite-breeze'] as const)
    expect(
      assessField({ ...good, design: { ...good.design, base } }, answers)
        .complete,
    ).toBe(true);
  expect(
    assessField(
      {
        ...good,
        design: { ...good.design, base: 'washed-sand', bench: [0, 33] },
      },
      answers,
    ).score,
  ).toBe(75);
  expect(layoutChecks({ ...initialDesign, bench: [-5, 33] }).doorwayClear).toBe(
    true,
  );
  expect(layoutChecks({ ...initialDesign, bench: [-21, 30] }).treeClear).toBe(
    false,
  );
});
it('yard: strict request schema rejects claimed grades, non-finite coordinates and out-of-yard positions', () => {
  expect(
    yardActionSchema.safeParse({
      action: 'assess',
      answers,
      evidence: good,
      score: 100,
    }).success,
  ).toBe(false);
  expect(
    yardActionSchema.safeParse({
      action: 'save',
      evidence: { ...good, trace: [[Infinity, 2]] },
    }).success,
  ).toBe(false);
  expect(
    yardActionSchema.safeParse({
      action: 'save',
      evidence: { ...good, design: { ...initialDesign, bench: [30, 20] } },
    }).success,
  ).toBe(false);
});
it('yard: scripted homeowner responds to actual proposed access and inspection context', async () => {
  const persona = loadPersonas().find((p) => p.slug === 'maya-and-dan')!;
  const input: ChatInput = {
    system: 'test',
    messages: [{ role: 'user', content: 'What do you think of the layout?' }],
    persona,
    scenario: persona.scenarios[0],
    yardContext: {
      observations: [],
      measuredArea: null,
      turf: true,
      pavers: false,
      doorwayClear: false,
      base: 'limestone-chat',
    },
  };
  const provider = new MockProvider();
  expect((await provider.chat(input)).value).toContain('blocks our route');
  expect(
    (
      await provider.chat({
        ...input,
        yardContext: { ...input.yardContext!, doorwayClear: true },
      })
    ).value,
  ).toContain('door route is open');
  expect(
    (
      await provider.chat({
        ...input,
        messages: [{ role: 'user', content: 'Tell me about the drainage' }],
      })
    ).value,
  ).toContain('walk over and look');
});
