import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function sanitizeNextPath(value) {
  if (!value || !value.startsWith('/')) return '/login'
  if (value.startsWith('//')) return '/login'
  return value
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'))
  const redirectUrl = new URL(nextPath, requestUrl.origin)
  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(redirectUrl)
    }

    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(redirectUrl)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!error) {
      return NextResponse.redirect(redirectUrl)
    }

    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(redirectUrl)
  }

  redirectUrl.pathname = '/login'
  redirectUrl.searchParams.set('error', 'Der Bestätigungslink ist ungueltig oder abgelaufen.')
  return NextResponse.redirect(redirectUrl)
}
