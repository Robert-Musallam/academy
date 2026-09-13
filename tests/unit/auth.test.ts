import { describe, it, expect, vi } from 'vitest';
import { requestMagicLink, hasRole, rosterInput } from '@/lib/auth';

describe('roster-gated auth', () => {
  it('sends a link only for a normalized roster email', async () => {
    const send = vi.fn();
    const isRostered = vi.fn().mockResolvedValue(true);
    expect(
      (await requestMagicLink(' Rep@Example.com ', { isRostered, send }))
        .status,
    ).toBe(200);
    expect(send).toHaveBeenCalledWith('rep@example.com');
    expect(isRostered).toHaveBeenCalledWith('rep@example.com');
  });
  it('returns 403 and sends nothing for a non-roster email', async () => {
    const send = vi.fn();
    expect(
      (
        await requestMagicLink('stranger@example.com', {
          isRostered: async () => false,
          send,
        })
      ).status,
    ).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });
  it('rejects malformed email before looking up the roster', async () => {
    const lookup = vi.fn();
    expect(
      (await requestMagicLink('invalid', { isRostered: lookup, send: vi.fn() }))
        .status,
    ).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('does not grant manager authority to a trainee', () => {
    expect(
      hasRole(
        [
          {
            id: 'a',
            tenant_id: 'rnb',
            track_id: null,
            role: 'trainee',
            email: 'a@example.com',
          },
        ],
        'manager',
      ),
    ).toBe(false);
  });
  it('requires trainees to have a track', () => {
    expect(
      rosterInput.safeParse({
        email: 'a@example.com',
        tenant_id: '10000000-0000-4000-8000-000000000001',
        track_id: '',
        manager_id: '',
        role: 'trainee',
      }).success,
    ).toBe(false);
  });
});
