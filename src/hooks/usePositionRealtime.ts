import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealtimePosition {
  id: string;
  title: string;
  davids_take?: string | null;
  owner_quote?: string | null;
  sections: unknown;
  signal_refs: unknown;
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchLatest = useCallback(async (_reason: string) => {
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
    if (error) return null;
    return data;
  }, [userId, conversationId]);

  useEffect(() => {
    if (!userId) return;

    fetchLatest('mount-fetch').then((data) => {
      if (data && mountedRef.current) setPosition(data as unknown as RealtimePosition);
    });

    const filter = conversationId
      ? `conversation_id=eq.${conversationId}`
      : `user_id=eq.${userId}`;

    const channel = supabase
      .channel(`positions-rt-${conversationId ?? userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'positions', filter },
        (payload) => {
          if (!mountedRef.current) return;
          setPosition(payload.new as unknown as RealtimePosition);
          setIsGenerating(false);
          stopPolling();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'positions', filter },
        (payload) => {
          if (!mountedRef.current) return;
          setPosition(payload.new as unknown as RealtimePosition);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, conversationId]);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStartRef.current = null;
  };

  useEffect(() => {
    if (!isGenerating || !userId || !conversationId) {
      stopPolling();
      return;
    }

    pollStartRef.current = Date.now();

    const poll = async () => {
      if (!mountedRef.current) { stopPolling(); return; }
      const elapsed = Date.now() - (pollStartRef.current ?? Date.now());
      if (elapsed > POLL_MAX_MS) {
        stopPolling();
        if (mountedRef.current) setIsGenerating(false);
        return;
      }

      const { data } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && mountedRef.current) {
        setPosition(data as unknown as RealtimePosition);
        setIsGenerating(false);
        stopPolling();
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => { stopPolling(); };
  }, [isGenerating, userId, conversationId, fetchLatest]);

  return { position, isGenerating, setIsGenerating };
}
