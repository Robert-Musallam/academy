import { describe, it, expect, vi } from 'vitest';
import {
  adaptiveSchema,
  buildDigest,
  reportingWeek,
  scheduledNow,
  type DigestMember,
} from '@/lib/digest/build';
import { authorized, deliverDigest } from '@/lib/digest/delivery';
const now = new Date('2026-09-14T13:00:00Z');
const member: DigestMember = {
  id: 'one',
  email: 'stalled@example.invalid',
  created_at: '2026-08-01T10:00:00Z',
  activity: ['2026-09-08T15:00:00Z'],
  started: ['2026-09-08T15:00:00Z'],
  passes: [{ title: 'Foundations', at: '2026-09-08T15:00:00Z' }],
  sims: [{ tier: 'warm', at: '2026-09-09T15:00:00Z' }],
};
describe('digest', () => {
  it('valid Adaptive Card includes a stalled trainee and completed-week activity', () => {
    const d = buildDigest('RNB', [member], now);
    expect(adaptiveSchema.safeParse(d.payload).success).toBe(true);
    const text = JSON.stringify(d.payload);
    expect(text).toContain('stalled@example.invalid');
    expect(text).toContain('No activity for more than 3 days: 1');
    expect(text).toContain('warm 1');
    expect(d.week).toEqual({ start: '2026-09-07', end: '2026-09-14' });
  });
  it('uses Denver civil time across summer, winter and DST transition weeks', () => {
    expect(scheduledNow(now)).toBe(true);
    expect(scheduledNow(new Date('2026-09-14T14:00:00Z'))).toBe(false);
    expect(scheduledNow(new Date('2026-12-07T14:00:00Z'))).toBe(true);
    expect(scheduledNow(new Date('2026-12-07T13:00:00Z'))).toBe(false);
    expect(reportingWeek(new Date('2026-11-02T14:00:00Z'))).toEqual({
      start: '2026-10-26',
      end: '2026-11-02',
    });
  });
  it('requires a nonempty cron credential and rejects mismatches', () => {
    expect(authorized(null, undefined)).toBe(false);
    expect(authorized('Bearer fixture', 'fixture')).toBe(true);
    expect(authorized('Bearer wrong', 'fixture')).toBe(false);
  });
  it('dry-run never claims, writes or posts; duplicate claim never posts', async () => {
    const deps = {
      claim: vi.fn(async () => null),
      post: vi.fn(async () => {}),
      finish: vi.fn(async () => {}),
    };
    await deliverDigest({}, deps, true);
    expect(deps.claim).not.toHaveBeenCalled();
    await deliverDigest({}, deps);
    expect(deps.post).not.toHaveBeenCalled();
  });
  it('records success and sanitized failures', async () => {
    const deps = {
      claim: vi.fn(async () => 'one'),
      post: vi.fn(async () => {}),
      finish: vi.fn(async () => {}),
    };
    await deliverDigest({}, deps);
    expect(deps.finish).toHaveBeenCalledWith('one', 'sent');
    deps.post.mockRejectedValueOnce(new Error('private transport details'));
    await expect(deliverDigest({}, deps)).rejects.toThrow(
      'Digest delivery failed',
    );
    expect(deps.finish).toHaveBeenLastCalledWith('one', 'failed');
  });
  it('bounds large rosters and excludes completed trainees from stalled list', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      ...member,
      id: String(i),
      email: `person${i}@example.invalid`,
    }));
    const d = buildDigest('RNB', many, now);
    expect(Buffer.byteLength(JSON.stringify(d.payload))).toBeLessThan(27000);
    expect(JSON.stringify(d.payload)).toContain('480 more');
    const done = buildDigest(
      'RNB',
      [{ ...member, passes: [{ title: 'Field', at: '2026-09-08T15:00:00Z' }] }],
      now,
    );
    expect(JSON.stringify(done.payload)).toContain(
      'No activity for more than 3 days: 0',
    );
  });
});
