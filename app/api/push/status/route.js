import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Du bist nicht angemeldet.' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { count, error } = await admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      subscriptions: count || 0,
      configured: Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
