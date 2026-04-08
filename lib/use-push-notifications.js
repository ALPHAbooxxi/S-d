'use client'

import { useState, useCallback } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  ))
  const [subscription, setSubscription] = useState(null)
  const [swRegistration, setSwRegistration] = useState(null)
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

  const requestPermission = useCallback(async () => {
    if (!supported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        const registration = swRegistration || await registerSW()
        if (!registration) return false

        // For now we use a placeholder VAPID key
        // In production, generate real VAPID keys and store the subscription in Supabase
        try {
          const sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              // Placeholder – replace with real VAPID public key from Supabase or your backend
              'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-qy19yWM5dSxIPm36qFyGw_e4ABPFcWAGH6wng'
            ),
          })
          setSubscription(sub)
          // TODO: Send subscription to Supabase when backend is connected
          return true
        } catch (subErr) {
          console.warn('Push subscription failed:', subErr)
          return false
        }
      }
      return result === 'granted'
    } catch (err) {
      console.warn('Permission request failed:', err)
      return false
    }
  }, [registerSW, supported, swRegistration])

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
    requestPermission,
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
