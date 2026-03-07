export interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  trim: string | null
  color: string | null
  vin: string | null
  current_mileage: number
  created_at: string
}

export interface OilChange {
  id: string
  vehicle_id: string
  service_date: string
  facility: string | null
  odometer: number
  interval_miles: number | null
  interval_months: number | null
  notes: string | null
  created_at: string
}

export interface ServiceRecord {
  id: string
  vehicle_id: string
  service_date: string
  facility: string | null
  odometer: number | null
  services_performed: string[] | null
  notes: string | null
  created_at: string
}

export interface IntervalItem {
  id: string
  vehicle_id: string
  name: string
  type: 'regular' | 'ad_hoc'
  last_service_date: string | null
  last_service_miles: number | null
  recommended_interval_miles: number | null
  next_service_miles: number | null
  due_soon_threshold_miles: number
  estimated_cost: number | null
  notes: string | null
  target_date: string | null
  target_miles: number | null
  status: 'overdue' | 'due_soon' | 'ok' | 'ad_hoc' | null
  miles_remaining: number | null
  created_at: string
  updated_at: string
}

export interface Observation {
  id: string
  vehicle_id: string
  observation_date: string
  odometer: number | null
  observation: string
  resolved: boolean
  resolved_date: string | null
  created_at: string
}

export interface NextOilChange {
  due_at_miles: number | null
  miles_remaining: number | null
  estimated_weeks: number | null
  last_date: string | null
  last_facility: string | null
}

export interface CostSummary {
  overdue_count: number
  overdue_total: number
  due_soon_count: number
  due_soon_total: number
  subtotal: number
  shop_fee: number
  tax: number
  total: number
}

export interface MileageStats {
  daily: number
  weekly: number
  monthly: number
  data_points: number
}

export interface Dashboard {
  vehicle: Vehicle
  overdue_items: IntervalItem[]
  due_soon_items: IntervalItem[]
  next_oil_change: NextOilChange
  cost_summary: CostSummary
  mileage_stats: MileageStats
}

export interface Settings {
  id: number
  shop_fee: number
  tax_rate: number
}

export type ServiceHistoryEntry =
  | { type: 'oil_change'; data: OilChange }
  | { type: 'service'; data: ServiceRecord }

export type IntervalStatus = 'overdue' | 'due_soon' | 'ok' | 'ad_hoc'

// Create input types (match backend Pydantic schemas)

export interface OilChangeCreate {
  service_date: string
  facility?: string | null
  odometer: number
  notes?: string | null
}

export interface ServiceRecordCreate {
  service_date: string
  facility?: string | null
  odometer?: number | null
  services_performed?: string[] | null
  notes?: string | null
}

export interface ObservationCreate {
  observation_date: string
  odometer?: number | null
  observation: string
}

export interface IntervalItemCreate {
  name: string
  type: 'regular' | 'ad_hoc'
  last_service_date?: string | null
  last_service_miles?: number | null
  recommended_interval_miles?: number | null
  next_service_miles?: number | null
  due_soon_threshold_miles?: number
  estimated_cost?: number | null
  notes?: string | null
  target_date?: string | null
  target_miles?: number | null
}

export interface VehicleUpdate {
  year?: number
  make?: string
  model?: string
  trim?: string | null
  color?: string | null
  vin?: string | null
}

export interface SettingsUpdate {
  shop_fee?: number
  tax_rate?: number
}

export interface AttachmentMeta {
  id: string
  filename: string
  mime_type: string
  file_size_bytes: number
}
