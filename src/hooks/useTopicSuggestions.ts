import { useState, useEffect, useCallback } from 'react'
import { TopicSuggestion } from '../types/suggestions'
import { supabase } from '@/integrations/supabase/client'

export function useTopicSuggestions() {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setLoading(true)
      const { data, error } = await (supabase as any)
        .from('topic_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[Suggestions] Fetch failed:', error)
        return
      }
      setSuggestions(data || [])
    } catch (e) {
      console.warn('[Suggestions] Fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
    const interval = setInterval(fetchSuggestions, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSuggestions])

  const accept = async (suggestionId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Optimistic removal
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))

      const { data, error } = await (supabase as any)
        .from('topic_suggestions')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', suggestionId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('[Suggestions] Accept failed:', error)
        fetchSuggestions()
        return null
      }

      return data?.thread_id || null
    } catch (e) {
      console.error('[Suggestions] Accept failed:', e)
      fetchSuggestions()
      return null
    }
  }

  const dismiss = async (suggestionId: string) => {
    // Optimistic removal
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await (supabase as any)
        .from('topic_suggestions')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', suggestionId)
        .eq('user_id', user.id)

      if (error) {
        console.error('[Suggestions] Dismiss failed:', error)
        fetchSuggestions()
      }
    } catch (e) {
      console.error('[Suggestions] Dismiss failed:', e)
      fetchSuggestions()
    }
  }

  return { suggestions, loading, accept, dismiss, refetch: fetchSuggestions }
}
