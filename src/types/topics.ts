export interface DecisionThread {
  id: string
  user_id: string
  title: string
  lens: string
  status: 'active' | 'archived'
  monitor_level: 'breaking' | 'priority' | 'standard'
  category?: string
  created_at: string
  updated_at: string
  insight_count?: number
  last_signal_at?: string
}
