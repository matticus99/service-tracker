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

export interface ServiceRecordItem {
  id: string
  service_record_id: string
  service_definition_id: string | null
  custom_service_name: string | null
  cost: number | null
  display_order: number
}

export interface ServiceRecord {
  id: string
  vehicle_id: string
  service_date: string
  facility: string | null
  odometer: number | null
  services_performed: string[] | null
  notes: string | null
  shop_id: string | null
  total_cost: number | null
  shop_fee: number | null
  tax: number | null
  items: ServiceRecordItem[]
  linked_observation_ids: string[]
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
  record_type: string | null
  service_definition_id: string | null
  category_id: string | null
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
  linked_service_record_ids: string[]
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
  weekly_digest_enabled: boolean
  weekly_digest_day: number
}

export type ServiceHistoryEntry =
  | { type: 'oil_change'; data: OilChange }
  | { type: 'service'; data: ServiceRecord }

export type IntervalStatus = 'overdue' | 'due_soon' | 'ok' | 'ad_hoc'

// Categories & service definitions

export interface ServiceDefinition {
  id: string
  category_id: string
  name: string
}

export interface ServiceCategory {
  id: string
  name: string
  display_order: number
  services: ServiceDefinition[]
}

// Shops

export interface Shop {
  id: string
  vehicle_id: string
  name: string
  address: string | null
  phone: string | null
  website: string | null
  hours: string | null
  google_place_id: string | null
  created_at: string
}

export interface ShopCreate {
  name: string
  address?: string | null
  phone?: string | null
  website?: string | null
  hours?: string | null
  google_place_id?: string | null
}

export interface ShopUpdate {
  name?: string
  address?: string | null
  phone?: string | null
  website?: string | null
  hours?: string | null
  google_place_id?: string | null
}

// Note-service links

export interface NoteServiceLink {
  id: string
  observation_id: string
  service_record_id: string
}

// Create input types (match backend Pydantic schemas)

export interface OilChangeCreate {
  service_date: string
  facility?: string | null
  odometer: number
  notes?: string | null
}

export interface ServiceRecordItemCreate {
  service_definition_id?: string | null
  custom_service_name?: string | null
  cost?: number | null
  display_order?: number
}

export interface ServiceRecordCreate {
  service_date: string
  facility?: string | null
  odometer?: number | null
  services_performed?: string[] | null
  notes?: string | null
  shop_id?: string | null
  total_cost?: number | null
  shop_fee?: number | null
  tax?: number | null
  items?: ServiceRecordItemCreate[] | null
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
  record_type?: string | null
  service_definition_id?: string | null
  category_id?: string | null
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
  weekly_digest_enabled?: boolean
  weekly_digest_day?: number
}

export interface PushSubscriptionInfo {
  id: string
  vehicle_id: string
  endpoint: string
  device_label: string | null
  created_at: string
}

export interface AttachmentMeta {
  id: string
  filename: string
  mime_type: string
  file_size_bytes: number
}
