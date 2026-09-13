import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { YardLab } from '@/components/yard/lab';
import './yard.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Field Lab | Rock N Block Academy' };
export default async function YardPreview() {
  const host = (await headers()).get('host')?.split(':')[0];
  if (
    process.env.NODE_ENV !== 'development' ||
    !['localhost', '127.0.0.1'].includes(host ?? '')
  )
    notFound();
  return <YardLab />;
}
