import { useEffect, useRef, useState, useCallback } from 'react';
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

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_MS = 60_000;

export function usePositionRealtime(userId: string | null, conversationId?: string | null) {
  const [position, setPosition] = useState<RealtimePosition | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number | null>(null);

  const TAG = '[usePositionRealtime]';

  // Stable fetch function — uses conversationId if available, else userId only
  const fetchLatest = useCallback(async (reason: string) => {
    if (!userId) return null;

    let query = supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn(`${TAG} ${reason} query error:`, error.message);
      return null;
    }
    console.log(`${TAG} ${reason} result:`, data ? `found id=${data.id}` : 'nothing found',
      `(userId=${userId}, convId=${conversationId ?? 'null'})`);
    return data;
  }, [userId, conversationId]);

  // Mount: fetch latest + subscribe to realtime
  useEffect(() => {
    if (!userId) return;

    console.log(`${TAG} mounted — userId=${userId}, conversationId=${conversationId ?? 'null'}`);

    // Fetch latest on mount
    fetchLatest('mount-fetch').then((data) => {
      if (data) setPosition(data as unknown as RealtimePosition);
    });

    // Build realtime filter
    const filter = conversationId
      ? `conversation_id=eq.${conversationId}`
      : `user_id=eq.${userId}`;

    console.log(`${TAG} subscribing with filter: ${filter}`);

    const channel = supabase
      .channel(`positions-rt-${conversationId ?? userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'positions', filter },
        (payload) => {
          console.log(`${TAG} Realtime INSERT received: id=${(payload.new as any)?.id}`);
          setPosition(payload.new as unknown as RealtimePosition);
          setIsGenerating(false);
          stopPolling();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'positions', filter },
        (payload) => {
          console.log(`${TAG} Realtime UPDATE received: id=${(payload.new as any)?.id}`);
          setPosition(payload.new as unknown as RealtimePosition);
        }
      )
      .subscribe((status) => {
        console.log(`${TAG} channel status: ${status}`);
      });

    return () => {
      console.log(`${TAG} cleanup — removing channel`);
      supabase.removeChannel(channel);
      stopPolling();
    };
  }, [userId, conversationId]);

  // Stop polling helper
  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStartRef.current = null;
  };

  // Aggressive polling: every 5s while isGenerating, max 60s
  useEffect(() => {
    if (!isGenerating || !userId) {
      stopPolling();
      return;
    }

    console.log(`${TAG} isGenerating=true — starting 5s poll (max 60s). convId=${conversationId ?? 'null'}`);
    pollStartRef.current = Date.now();

    const poll = async () => {
      const elapsed = Date.now() - (pollStartRef.current ?? Date.now());
      if (elapsed > POLL_MAX_MS) {
        console.warn(`${TAG} polling timed out after 60s — giving up`);
        stopPolling();
        setIsGenerating(false);
        return;
      }

      console.log(`${TAG} polling fallback tick (${Math.round(elapsed / 1000)}s elapsed)`);

      // Try with conversationId first, then fallback to userId-only
      let data = await fetchLatest('poll-with-convId');

      if (!data && conversationId) {
        console.log(`${TAG} no result with convId, retrying userId-only`);
        const { data: fallbackData } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (fallbackData) {
          console.log(`${TAG} userId-only fallback found id=${fallbackData.id}`);
          data = fallbackData;
        }
      }

      if (data) {
        setPosition(data as unknown as RealtimePosition);
        setIsGenerating(false);
        stopPolling();
      }
    };

    // First poll immediately
    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, [isGenerating, userId, conversationId, fetchLatest]);

  return { position, isGenerating, setIsGenerating };
}
