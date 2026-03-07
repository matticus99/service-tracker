/**
 * Push notification subscription utilities.
 * Handles browser Push API integration and device registration.
 */

const API_BASE = '/api/v1'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function detectDeviceLabel(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux PC'
  return 'Unknown Device'
}

export async function subscribeToPush(vehicleId: string, deviceLabel?: string): Promise<boolean> {
  // 1. Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  // 2. Wait for service worker
  const registration = await navigator.serviceWorker.ready

  // 3. Get VAPID public key from server
  const res = await fetch(`${API_BASE}/push/vapid-public-key`)
  if (!res.ok) throw new Error('Failed to get VAPID key')
  const { public_key } = await res.json()

  // 4. Subscribe via Push API
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(public_key),
  })

  // 5. Send subscription to backend
  const subJson = subscription.toJSON()
  const registerRes = await fetch(`${API_BASE}/vehicles/${vehicleId}/push-subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      device_label: deviceLabel || detectDeviceLabel(),
    }),
  })

  return registerRes.ok
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.ready
    return registration.pushManager.getSubscription()
  } catch {
    return null
  }
}
