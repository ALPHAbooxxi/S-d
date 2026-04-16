import { type NextRequest } from 'next/server'
import { createClient } from './utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Refresh Supabase auth session cookies on every request.
  // This keeps the session alive even after the PWA is closed
  // and reopened from the home screen / app switcher.
  return await createClient(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
