import { actor } from '@/lib/training/access';
import { allowed } from '@/lib/training/progress';
import { YardLab } from '@/components/yard/lab';
import '@/app/review/yard/yard.css';
export default async function FieldLab() {
  const m = await actor();
  await allowed(m, 'simulator');
  return <YardLab endpoint="/learn/field-lab/api" preview={false} />;
}
