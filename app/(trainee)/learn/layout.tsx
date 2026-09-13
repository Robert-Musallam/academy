import Link from 'next/link';
import { actor } from '@/lib/training/access';
import './training.css';
export const dynamic = 'force-dynamic';
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await actor();
  return (
    <>
      <header className="training-header">
        <Link href="/learn">
          <strong>A / ACADEMY</strong>
        </Link>
        <nav>
          <Link href="/learn">Your path</Link>
          <Link href="/learn/history">History</Link>
          {member.role !== 'trainee' && <Link href="/manager">Manager</Link>}
          {member.role === 'admin' && <Link href="/admin/roster">Roster</Link>}
          <form action="/auth/logout" method="post">
            <button>Sign out</button>
          </form>
        </nav>
      </header>
      {process.env.LLM_PROVIDER === 'mock' && (
        <p className="training-notice">
          Practice mode · Scripted conversations and illustrative grading until
          provider setup.
        </p>
      )}
      <main className="training-main">{children}</main>
    </>
  );
}
