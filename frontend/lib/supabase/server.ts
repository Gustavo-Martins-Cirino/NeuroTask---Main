import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(cookieStore?: Awaited<ReturnType<typeof cookies>>) {
  const store = cookieStore ?? (await cookies())

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
