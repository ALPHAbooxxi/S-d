import { createClient } from '@supabase/supabase-js'

let adminClient = null

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Fuer Admin-Zugriffe fehlen NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY.')
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}
