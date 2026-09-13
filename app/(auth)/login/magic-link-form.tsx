'use client';

import { useState, type FormEvent } from 'react';

export function MagicLinkForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        body: form,
      });
      const result = await response.json();
      setMessage(result.message);
    } catch {
      setMessage('Unable to connect. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        Email
        <input
          className="mt-2 w-full rounded border border-stone-400 p-3"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <button
        disabled={pending}
        className="w-full rounded bg-emerald-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send sign-in link'}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
