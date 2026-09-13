import { MagicLinkForm } from './magic-link-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest">
        Rock N Block Academy
      </p>
      <h1 className="mt-4 text-4xl font-bold">Welcome back</h1>
      <p className="my-6 text-stone-600">
        Use the email your manager added to the training roster. We’ll send you
        a sign-in link.
      </p>
      {error && (
        <p role="alert" className="mb-4 text-red-800">
          Your sign-in link could not be used. Request another link or contact
          your manager.
        </p>
      )}
      <MagicLinkForm />
    </main>
  );
}
