import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSubscriptionPayload(body) {
  return {
    endpoint: body?.endpoint,
    p256dh_key: body?.keys?.p256dh,
    auth_key: body?.keys?.auth,
  }
}

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
  const subscription = getSubscriptionPayload(body)

  if (!subscription.endpoint || !subscription.p256dh_key || !subscription.auth_key) {
    return NextResponse.json({ error: 'Ungueltige Push-Subscription.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.p256dh_key,
      auth_key: subscription.auth_key,
      user_agent: request.headers.get('user-agent') || null,
      last_seen_at: new Date().toISOString(),
    }, {
      onConflict: 'endpoint',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Du bist nicht angemeldet.' }, { status: 401 })
  }

  const body = await request.json()
  const endpoint = body?.endpoint

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint fehlt.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
