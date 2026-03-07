import { useState, useEffect } from 'react'
import { Car, DollarSign, Database, Bell, Save, Trash2, Send, Smartphone, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FormField, inputClass } from '@/components/forms/FormField'
import { useVehicle } from '@/context/VehicleContext'
import {
  useSettings,
  useUpdateVehicle,
  useUpdateSettings,
  usePushSubscriptions,
  useDeletePushSubscription,
  useSendTestNotification,
} from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'
import { PageSkeleton } from '@/components/ui/Skeleton'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from '@/lib/pushNotifications'
import type { Settings } from '@/types/api'

export function SettingsPage() {
  const { vehicleId, vehicle } = useVehicle()
  const { data: settings, isLoading } = useSettings()
  const { toast } = useToast()

  if (isLoading) return <PageSkeleton cards={3} />

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {vehicle && vehicleId && (
        <VehicleInfoCard vehicleId={vehicleId} vehicle={vehicle} toast={toast} />
      )}
      {settings && <CostSettingsCard settings={settings} toast={toast} />}
      <DataCard />
      {vehicleId && settings && (
        <NotificationsCard vehicleId={vehicleId} settings={settings} toast={toast} />
      )}
    </div>
  )
}

function VehicleInfoCard({
  vehicleId,
  vehicle,
  toast,
}: {
  vehicleId: string
  vehicle: { year: number; make: string; model: string; trim: string | null; color: string | null; vin: string | null }
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const mutation = useUpdateVehicle()
  const [year, setYear] = useState(String(vehicle.year))
  const [make, setMake] = useState(vehicle.make)
  const [model, setModel] = useState(vehicle.model)
  const [trim, setTrim] = useState(vehicle.trim ?? '')
  const [color, setColor] = useState(vehicle.color ?? '')
  const [vin, setVin] = useState(vehicle.vin ?? '')

  useEffect(() => {
    setYear(String(vehicle.year))
    setMake(vehicle.make)
    setModel(vehicle.model)
    setTrim(vehicle.trim ?? '')
    setColor(vehicle.color ?? '')
    setVin(vehicle.vin ?? '')
  }, [vehicle])

  function handleSave() {
    const y = parseInt(year, 10)
    if (isNaN(y) || !make.trim() || !model.trim()) {
      toast('Year, make, and model are required', 'error')
      return
    }
    mutation.mutate(
      {
        vehicleId,
        data: {
          year: y,
          make: make.trim(),
          model: model.trim(),
          trim: trim.trim() || null,
          color: color.trim() || null,
          vin: vin.trim() || null,
        },
      },
      {
        onSuccess: () => toast('Vehicle info updated'),
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Car className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Vehicle Info
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Year" required>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Make" required>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Model" required>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Trim">
          <input
            type="text"
            value={trim}
            onChange={(e) => setTrim(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Color">
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="VIN">
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>
      <button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </Card>
  )
}

function CostSettingsCard({
  settings,
  toast,
}: {
  settings: { shop_fee: number; tax_rate: number }
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const mutation = useUpdateSettings()
  const [shopFee, setShopFee] = useState(settings.shop_fee.toFixed(2))
  const [taxRate, setTaxRate] = useState(
    (settings.tax_rate * 100).toFixed(1),
  )

  useEffect(() => {
    setShopFee(settings.shop_fee.toFixed(2))
    setTaxRate((settings.tax_rate * 100).toFixed(1))
  }, [settings])

  function handleSave() {
    const fee = parseFloat(shopFee)
    const rate = parseFloat(taxRate)
    if (isNaN(fee) || isNaN(rate) || fee < 0 || rate < 0) {
      toast('Invalid values', 'error')
      return
    }
    mutation.mutate(
      { shop_fee: fee, tax_rate: rate / 100 },
      {
        onSuccess: () => toast('Cost settings updated'),
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  return (
    <Card delay={0.06}>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Cost Settings
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Shop Fee ($)">
          <input
            type="number"
            value={shopFee}
            onChange={(e) => setShopFee(e.target.value)}
            step="0.01"
            min="0"
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Tax Rate (%)">
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            step="0.1"
            min="0"
            className={`${inputClass} font-mono`}
          />
        </FormField>
      </div>
      <button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </Card>
  )
}

function DataCard() {
  return (
    <Card delay={0.12}>
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Data
        </span>
      </div>
      <button
        onClick={() => window.open(api.export.url(), '_blank')}
        className="w-full py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
      >
        Export All Data (JSON)
      </button>
    </Card>
  )
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function NotificationsCard({
  vehicleId,
  settings,
  toast,
}: {
  vehicleId: string
  settings: Settings
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const { data: subscriptions, refetch } = usePushSubscriptions(vehicleId)
  const deleteSub = useDeletePushSubscription()
  const sendTest = useSendTestNotification()
  const updateSettings = useUpdateSettings()

  const [isSubscribing, setIsSubscribing] = useState(false)
  const [hasCurrentSub, setHasCurrentSub] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  const supported = isPushSupported()
  const permission = getNotificationPermission()

  useEffect(() => {
    getCurrentSubscription().then((sub) => setHasCurrentSub(!!sub))
  }, [])

  async function handleSubscribe() {
    setIsSubscribing(true)
    try {
      const ok = await subscribeToPush(vehicleId)
      if (ok) {
        toast('Notifications enabled')
        setHasCurrentSub(true)
        refetch()
      } else {
        toast('Permission denied or subscription failed', 'error')
      }
    } catch {
      toast('Failed to enable notifications', 'error')
    }
    setIsSubscribing(false)
  }

  async function handleUnsubscribe() {
    await unsubscribeFromPush()
    setHasCurrentSub(false)
    toast('Notifications disabled on this device')
  }

  function handleDelete(subId: string) {
    deleteSub.mutate(
      { vehicleId, subId },
      {
        onSuccess: () => toast('Device removed'),
        onError: () => toast('Failed to remove', 'error'),
      },
    )
  }

  function handleTest(subId: string) {
    sendTest.mutate(subId, {
      onSuccess: () => toast('Test notification sent'),
      onError: () => toast('Failed to send test', 'error'),
    })
  }

  function handleDigestToggle(enabled: boolean) {
    updateSettings.mutate(
      { weekly_digest_enabled: enabled },
      {
        onSuccess: () => toast(enabled ? 'Weekly digest enabled' : 'Weekly digest disabled'),
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  function handleDigestDay(day: number) {
    updateSettings.mutate(
      { weekly_digest_day: day },
      {
        onSuccess: () => toast(`Digest day set to ${DAYS[day]}`),
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  return (
    <Card delay={0.18}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Push Notifications
        </span>
      </div>

      {!supported ? (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Push notifications are not supported in this browser.
          </p>
          <button
            onClick={() => setShowIosGuide(!showIosGuide)}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Smartphone className="w-3 h-3" />
            iOS? Tap here for setup instructions
            {showIosGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showIosGuide && <IosGuide />}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subscribe / Unsubscribe */}
          <div>
            {!hasCurrentSub ? (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing || permission === 'denied'}
                className="w-full py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isSubscribing
                  ? 'Enabling...'
                  : permission === 'denied'
                    ? 'Notifications Blocked (check browser settings)'
                    : 'Enable Notifications on This Device'}
              </button>
            ) : (
              <button
                onClick={handleUnsubscribe}
                className="w-full py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
              >
                Disable Notifications on This Device
              </button>
            )}
          </div>

          {/* Registered devices */}
          {subscriptions && subscriptions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Registered Devices
              </p>
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 bg-bg-elevated rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="w-4 h-4 text-text-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {sub.device_label || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-text-muted">
                          Added {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTest(sub.id)}
                        disabled={sendTest.isPending}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Send test notification"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={deleteSub.isPending}
                        className="p-1.5 text-text-muted hover:text-status-overdue transition-colors"
                        title="Remove device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly digest */}
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              Weekly Digest
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weekly_digest_enabled}
                  onChange={(e) => handleDigestToggle(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-primary">
                  Send weekly summary of due/overdue items
                </span>
              </label>
              {settings.weekly_digest_enabled && (
                <FormField label="Digest Day">
                  <select
                    value={settings.weekly_digest_day}
                    onChange={(e) => handleDigestDay(parseInt(e.target.value, 10))}
                    className={inputClass}
                  >
                    {DAYS.map((day, i) => (
                      <option key={i} value={i}>
                        {day}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
          </div>

          {/* iOS guide */}
          <button
            onClick={() => setShowIosGuide(!showIosGuide)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <Smartphone className="w-3 h-3" />
            iOS setup guide
            {showIosGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showIosGuide && <IosGuide />}
        </div>
      )}
    </Card>
  )
}

function IosGuide() {
  return (
    <div className="text-xs text-text-muted space-y-1.5 p-3 bg-bg-elevated rounded-lg">
      <p className="font-medium text-text-secondary">To enable push notifications on iOS:</p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Open this app in <strong>Safari</strong></li>
        <li>Tap the <strong>Share</strong> button (square with arrow)</li>
        <li>Tap <strong>"Add to Home Screen"</strong></li>
        <li>Open the app from your Home Screen</li>
        <li>Come back here and tap "Enable Notifications"</li>
      </ol>
      <p className="pt-1">Requires iOS 16.4 or later.</p>
    </div>
  )
}
