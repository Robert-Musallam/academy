import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academy | Rock N Block',
  description: 'Learn. Practice. Apply. Serve. Succeed.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
