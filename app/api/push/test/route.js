import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWebPush } from '@/lib/push-server'

export async function POST() {
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
    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    if (!subscriptions?.length) {
      return NextResponse.json({ error: 'Fuer diesen Account ist noch keine Push-Subscription gespeichert.' }, { status: 400 })
    }

    await Promise.all(
      subscriptions.map((subscription) =>
        sendWebPush(subscription, {
          title: 'Push ist aktiv',
          body: 'Diese Testnachricht wurde erfolgreich ueber den Server gesendet.',
          url: '/profil',
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
