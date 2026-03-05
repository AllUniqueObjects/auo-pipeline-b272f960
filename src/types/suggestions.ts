export interface TopicSuggestion {
  id: string
  user_id: string
  title: string
  reason: string
  detail: string
  source: 'orphan_cluster' | 'brand_gap' | 'deadline'
  confidence: number
  signal_ids: string[]
  category: string
  dismissed_at: string | null
  accepted_at: string | null
  created_at: string
  expires_at: string
}
