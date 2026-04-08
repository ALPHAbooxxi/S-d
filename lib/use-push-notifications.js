'use client'

import { useEffect, useState, useCallback } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  ))
  const [subscription, setSubscription] = useState(null)
  const [swRegistration, setSwRegistration] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [supported] = useState(() => (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  ))

  const registerSW = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      setSwRegistration(reg)

      const existingSub = await reg.pushManager.getSubscription()
      if (existingSub) {
        setSubscription(existingSub)
      }
      return reg
    } catch (err) {
      console.warn('Service Worker registration failed:', err)
      return null
    }
  }, [])

  const syncSubscriptionWithServer = useCallback(async (currentSubscription) => {
    const response = await fetch('/api/push/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentSubscription.toJSON()),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Push-Subscription konnte nicht gespeichert werden.')
    }
  }, [])

  const removeSubscriptionFromServer = useCallback(async (endpoint) => {
    const response = await fetch('/api/push/subscriptions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Push-Subscription konnte nicht entfernt werden.')
    }
  }, [])

  useEffect(() => {
    if (!supported || permission !== 'granted') return

    let active = true

    async function hydrateSubscription() {
      const registration = await registerSW()
      if (!registration || !active) return

      const existingSub = await registration.pushManager.getSubscription()
      if (active) {
        setSubscription(existingSub)
      }

      if (existingSub) {
        try {
          await syncSubscriptionWithServer(existingSub)
        } catch (err) {
          if (active) {
            setError(err.message || 'Bestehende Push-Subscription konnte nicht synchronisiert werden.')
          }
        }
      }
    }

    void hydrateSubscription()

    return () => {
      active = false
    }
  }, [permission, registerSW, supported, syncSubscriptionWithServer])

  const requestPermission = useCallback(async () => {
    if (!supported) return false

    try {
      setBusy(true)
      setError('')
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        const registration = swRegistration || await registerSW()
        if (!registration) return false

        try {
          const existingSub = await registration.pushManager.getSubscription()
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

          if (!publicKey) {
            throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY fehlt.')
          }

          const sub = existingSub || await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          })

          await syncSubscriptionWithServer(sub)
          setSubscription(sub)
          return true
        } catch (subErr) {
          setError(subErr.message || 'Push-Subscription fehlgeschlagen.')
          console.warn('Push subscription failed:', subErr)
          return false
        }
      }
      return result === 'granted'
    } catch (err) {
      setError(err.message || 'Push konnte nicht aktiviert werden.')
      console.warn('Permission request failed:', err)
      return false
    } finally {
      setBusy(false)
    }
  }, [registerSW, supported, swRegistration, syncSubscriptionWithServer])

  const disablePush = useCallback(async () => {
    if (!subscription) return false

    try {
      setBusy(true)
      setError('')
      await removeSubscriptionFromServer(subscription.endpoint)
      await subscription.unsubscribe()
      setSubscription(null)
      return true
    } catch (err) {
      setError(err.message || 'Push konnte nicht deaktiviert werden.')
      return false
    } finally {
      setBusy(false)
    }
  }, [removeSubscriptionFromServer, subscription])

  const sendTestPush = useCallback(async () => {
    try {
      setBusy(true)
      setError('')
      const response = await fetch('/api/push/test', {
        method: 'POST',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Test-Push konnte nicht gesendet werden.')
      }

      return true
    } catch (err) {
      setError(err.message || 'Test-Push konnte nicht gesendet werden.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  // Send a local notification (for testing / local demo)
  const sendLocalNotification = useCallback((title, body, url) => {
    if (permission !== 'granted' || !swRegistration) return

    swRegistration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: url || '/nachrichten' },
    })
  }, [permission, swRegistration])

  return {
    supported,
    permission,
    subscription,
    busy,
    error,
    requestPermission,
    disablePush,
    sendTestPush,
    sendLocalNotification,
  }
}

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
