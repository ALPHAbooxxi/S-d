import { createBrowserClient } from '@supabase/ssr'

let browserClient = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase env vars fehlen. Setze NEXT_PUBLIC_SUPABASE_URL und einen Publishable/Anon Key.')
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, key)
  }

  return browserClient
}
