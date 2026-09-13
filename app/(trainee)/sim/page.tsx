import { actor } from '@/lib/training/access';
import { allowed } from '@/lib/training/progress';
import { rows } from '@/lib/training/db';
import { publicPersona } from '@/lib/sim/engine';
import { personaSchema } from '@/lib/sim/schema';
import { Simulator } from '@/components/simulator/simulator';
export const dynamic = 'force-dynamic';
export default async function SimPage() {
  const m = await actor();
  await allowed(m, 'simulator');
  const personas = (
    await rows<{ brief: unknown }>('personas', {
      tenant_id: m.tenant_id,
      track_id: m.track_id,
    })
  ).map((p) => publicPersona(personaSchema.parse(p.brief)));
  return (
    <Simulator
      personas={personas}
      endpoint="/sim/api"
      mock={process.env.LLM_PROVIDER === 'mock'}
    />
  );
}
