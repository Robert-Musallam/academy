import Link from 'next/link';
import { actor } from '@/lib/training/access';
import '@/app/(trainee)/learn/training.css';
export const dynamic = 'force-dynamic';
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const m = await actor('manager');
  return (
    <>
      <header className="training-header">
        <Link href="/manager">
          <strong>A / ACADEMY · MANAGER</strong>
        </Link>
        <nav>
          <Link href="/manager">Team</Link>
          <Link href="/learn">Learning path</Link>
          {m.role === 'admin' && (
            <Link href="/admin/roster">Manage roster</Link>
          )}
        </nav>
      </header>
      <main className="training-main">{children}</main>
    </>
  );
}
