import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealtimePosition {
  id: string;
  title: string;
  davids_take?: string | null;
  owner_quote?: string | null;
  sections: unknown;
  position_essence: string | null;
  tone: string | null;
  created_at: string | null;
  user_id: string | null;
}

const POLL_FALLBACK_MS = 30_000;

export function usePositionRealtime(userId: string | null, conversationId?: string | null) {
  const [position, setPosition] = useState<RealtimePosition | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch latest position on mount
    const fetchLatest = async () => {
      let query = supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data } = await query.maybeSingle();
      if (data) setPosition(data as unknown as RealtimePosition);
    };
    fetchLatest();

    // Build realtime filter — filter by conversation_id when available
    const filter = conversationId
      ? `conversation_id=eq.${conversationId}`
      : `user_id=eq.${userId}`;

    const channel = supabase
      .channel(`positions-rt-${conversationId ?? userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'positions', filter },
        (payload) => {
          setPosition(payload.new as unknown as RealtimePosition);
          setIsGenerating(false);
          // Clear fallback poll since realtime delivered
          if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'positions', filter },
        (payload) => {
          setPosition(payload.new as unknown as RealtimePosition);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [userId, conversationId]);

  // 30-second polling fallback: when isGenerating turns true, start a timer.
  // If realtime hasn't delivered by then, poll Supabase directly.
  useEffect(() => {
    if (!isGenerating || !userId) {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    pollTimerRef.current = setTimeout(async () => {
      console.log('[usePositionRealtime] Fallback poll triggered after 30s');
      let query = supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data } = await query.maybeSingle();
      if (data) {
        setPosition(data as unknown as RealtimePosition);
        setIsGenerating(false);
      }
    }, POLL_FALLBACK_MS);

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isGenerating, userId, conversationId]);

  return { position, isGenerating, setIsGenerating };
}
