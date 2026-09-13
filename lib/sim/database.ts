import 'server-only';
import { randomUUID } from 'node:crypto';
import { rpc } from '@/lib/training/db';
import type { SimStore, Run } from './engine';
import type { Persona, Scenario } from './schema';
import type { SalesPolicy } from './policy';
export class DatabaseSimStore implements SimStore {
  async start(
    owner: string,
    persona: Persona,
    scenario: Scenario,
    policy: SalesPolicy,
    date: string,
  ): Promise<Run> {
    return rpc('academy_sim_start', {
      p_owner: owner,
      p_slug: persona.slug,
      p_state: {
        persona,
        scenario,
        policy,
        date,
        messages: [{ role: 'assistant', content: scenario.opening }],
        turns: 0,
        status: 'active',
        costs: [],
      },
    });
  }
  async get(owner: string, id: string): Promise<Run> {
    return rpc('academy_sim_get', { p_owner: owner, p_id: id });
  }
  async transaction<T>(
    owner: string,
    id: string,
    work: (run: Run) => Promise<T>,
  ) {
    const token = randomUUID();
    const run = await rpc<Run>('academy_sim_claim', {
      p_owner: owner,
      p_id: id,
      p_token: token,
    });
    try {
      const result = await work(run);
      await rpc('academy_sim_commit', {
        p_owner: owner,
        p_id: id,
        p_token: token,
        p_state: run,
      });
      return result;
    } catch (error) {
      await rpc('academy_sim_release', {
        p_owner: owner,
        p_id: id,
        p_token: token,
      });
      throw error;
    }
  }
}
