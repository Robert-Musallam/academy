import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error('Academy authentication is not configured.');
  return { url, key };
}

export async function sessionClient() {
  const { url, key } = config();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => {
        try {
          updates.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies; middleware refreshes them. */
        }
      },
    },
  });
}

export function adminClient() {
  const { url } = config();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Academy administration is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
