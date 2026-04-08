import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWebPush } from '@/lib/push-server'

export async function POST(request) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Du bist nicht angemeldet.' }, { status: 401 })
  }

  const body = await request.json()
  const receiverId = body?.receiverId
  const title = body?.title || 'SVD Stickertausch'
  const message = body?.body || 'Du hast eine neue Benachrichtigung.'
  const url = body?.url || '/nachrichten'

  if (!receiverId) {
    return NextResponse.json({ error: 'receiverId fehlt.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key')
      .eq('user_id', receiverId)

    if (error) {
      throw error
    }

    const results = await Promise.all(
      (subscriptions || []).map(async (subscription) => {
        try {
          await sendWebPush(subscription, {
            title,
            body: message,
            url,
          })

          return { ok: true }
        } catch (pushError) {
          const statusCode = pushError?.statusCode

          if (statusCode === 404 || statusCode === 410) {
            await admin
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id)
          }

          return { ok: false }
        }
      })
    )

    return NextResponse.json({
      success: true,
      delivered: results.filter((entry) => entry.ok).length,
      skipped: results.filter((entry) => !entry.ok).length,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
