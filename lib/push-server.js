import webpush from 'web-push'

let configured = false

function getPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@media-wilkens.de'

  if (!publicKey || !privateKey) {
    throw new Error('Push ist noch nicht komplett eingerichtet. Es fehlen NEXT_PUBLIC_VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY.')
  }

  return { publicKey, privateKey, subject }
}

function ensureConfigured() {
  if (configured) return

  const { publicKey, privateKey, subject } = getPushConfig()
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
}

export async function sendWebPush(subscription, payload) {
  ensureConfigured()

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    },
    JSON.stringify(payload)
  )
}
