'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const VAPID_KEY_STORAGE = 'svd_push_vapid_key'

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
  const [message, setMessage] = useState('')
  const [serverSubscriptionCount, setServerSubscriptionCount] = useState(0)
  const [serverConfigured, setServerConfigured] = useState(false)
  const autoConnectAttemptsRef = useRef(0)
  const permissionInFlightRef = useRef(false)
  const [supported] = useState(() => (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  ))

  const registerSW = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const readyRegistration = await navigator.serviceWorker.ready.catch(() => reg)
      const effectiveRegistration = readyRegistration || reg
      setSwRegistration(effectiveRegistration)

      const existingSub = await effectiveRegistration.pushManager.getSubscription()
      if (existingSub) {
        setSubscription(existingSub)
      }
      return effectiveRegistration
    } catch (err) {
      console.warn('Service Worker registration failed:', err)
      return null
    }
  }, [])

  const syncSubscriptionWithServer = useCallback(async (currentSubscription) => {
    const response = await fetch('/api/push/subscriptions', {
      method: 'POST',
      credentials: 'include',
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
      credentials: 'include',
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

  const refreshServerStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/push/status', {
        credentials: 'include',
      })
      const payload = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setServerSubscriptionCount(0)
        setServerConfigured(Boolean(payload.configured))
        return null
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Push-Status konnte nicht geladen werden.')
      }

      setServerSubscriptionCount(payload.subscriptions || 0)
      setServerConfigured(Boolean(payload.configured))
      return payload
    } catch (err) {
      setError(err.message || 'Push-Status konnte nicht geladen werden.')
      return null
    }
  }, [])

  const ensureSubscription = useCallback(async ({ forceResubscribe = false } = {}) => {
    const registration = swRegistration || await registerSW()
    if (!registration) return false

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!publicKey) {
      throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY fehlt.')
    }

    let existingSub = await registration.pushManager.getSubscription()
    const lastKnownVapidKey =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(VAPID_KEY_STORAGE)
        : null

    if (existingSub && (forceResubscribe || lastKnownVapidKey !== publicKey)) {
      try {
        await removeSubscriptionFromServer(existingSub.endpoint)
      } catch {
        // Old or broken subscriptions should not block re-subscribe.
      }

      await existingSub.unsubscribe()
      existingSub = null
    }

    const sub = existingSub || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    await syncSubscriptionWithServer(sub)
    setSubscription(sub)
    setMessage('Dieses Gerät ist jetzt für Push registriert.')
    await refreshServerStatus()

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VAPID_KEY_STORAGE, publicKey)
    }

    return true
  }, [refreshServerStatus, registerSW, removeSubscriptionFromServer, swRegistration, syncSubscriptionWithServer])

  const ensureConnected = useCallback(async ({ forceResubscribe = false } = {}) => {
    let lastError = null

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await ensureSubscription({ forceResubscribe: forceResubscribe || attempt > 0 })
        const status = await refreshServerStatus()

        if ((status?.subscriptions || 0) > 0) {
          setMessage('Dieses Gerät ist jetzt vollständig für Push verbunden.')
          return true
        }
      } catch (err) {
        lastError = err
      }

      await new Promise((resolve) => window.setTimeout(resolve, 500 + attempt * 400))
    }

    if (lastError) {
      throw lastError
    }

    throw new Error('Push wurde erlaubt, aber die Verbindung zum Push-Server konnte nicht abgeschlossen werden.')
  }, [ensureSubscription, refreshServerStatus])

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
          await ensureSubscription()
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
  }, [ensureSubscription, permission, registerSW, supported])

  useEffect(() => {
    if (!supported) return
    void refreshServerStatus()
  }, [refreshServerStatus, supported])

  useEffect(() => {
    if (permission !== 'granted') {
      autoConnectAttemptsRef.current = 0
      return
    }

    if (!supported || busy || serverSubscriptionCount > 0 || autoConnectAttemptsRef.current >= 3) {
      return
    }

    autoConnectAttemptsRef.current += 1

    const timeoutId = window.setTimeout(() => {
      void ensureConnected().catch((err) => {
        setError(err.message || 'Push-Subscription fehlgeschlagen.')
      })
    }, 600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [busy, ensureConnected, permission, serverSubscriptionCount, supported])

  const requestPermission = useCallback(async () => {
    if (!supported) return false
    if (permissionInFlightRef.current) return false

    try {
      permissionInFlightRef.current = true
      setBusy(true)
      setError('')
      setMessage('')
      const result = permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        try {
          return await ensureConnected()
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
      permissionInFlightRef.current = false
      setBusy(false)
    }
  }, [ensureConnected, permission, supported])

  const disablePush = useCallback(async () => {
    if (!subscription) return false

    try {
      setBusy(true)
      setError('')
      setMessage('')
      await removeSubscriptionFromServer(subscription.endpoint)
      await subscription.unsubscribe()
      setSubscription(null)
      setServerSubscriptionCount(0)
      setMessage('Dieses Gerät wurde von Push abgemeldet. Die Browser-Erlaubnis bleibt dabei bestehen.')
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(VAPID_KEY_STORAGE)
      }
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
      setMessage('')
      const response = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Test-Push konnte nicht gesendet werden.')
      }

      if (!payload.delivered) {
        throw new Error('Der Test wurde ausgeführt, aber an kein registriertes Gerät zugestellt.')
      }

      setMessage(`Test-Push gesendet: ${payload.delivered} zugestellt${payload.skipped ? `, ${payload.skipped} übersprungen` : ''}.`)
      return true
    } catch (err) {
      setError(err.message || 'Test-Push konnte nicht gesendet werden.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const reconnectPush = useCallback(async () => {
    try {
      setBusy(true)
      setError('')
      setMessage('')
      return await ensureConnected({ forceResubscribe: true })
    } catch (err) {
      setError(err.message || 'Push konnte nicht neu verbunden werden.')
      return false
    } finally {
      setBusy(false)
    }
  }, [ensureConnected])

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
    connected: permission === 'granted' && Boolean(subscription) && serverSubscriptionCount > 0,
    busy,
    error,
    message,
    serverSubscriptionCount,
    serverConfigured,
    requestPermission,
    disablePush,
    reconnectPush,
    refreshServerStatus,
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
