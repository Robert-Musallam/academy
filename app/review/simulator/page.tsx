import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { previewCatalog } from '@/lib/sim/preview';
import { Simulator } from '@/components/simulator/simulator';
export const dynamic = 'force-dynamic';
export default async function SimulatorPreview() {
  const host = (await headers()).get('host')?.split(':')[0];
  if (
    process.env.NODE_ENV !== 'development' ||
    !['localhost', '127.0.0.1'].includes(host ?? '')
  )
    notFound();
  return (
    <Simulator
      personas={previewCatalog()}
      endpoint="/review/simulator/api"
      preview
    />
  );
}
