import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealtimePosition {
  id: string;
  title: string;
  davids_take: string | null;
  sections: unknown;
  position_essence: string | null;
  tone: string | null;
  created_at: string | null;
  user_id: string | null;
}

export function usePositionRealtime(userId: string | null) {
  const [position, setPosition] = useState<RealtimePosition | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Fetch latest position on mount
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setPosition(data as RealtimePosition);
    };
    fetchLatest();

    // Subscribe to new and updated positions
    const channel = supabase
      .channel('positions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setPosition(payload.new as RealtimePosition);
          setIsGenerating(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setPosition(payload.new as RealtimePosition);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { position, isGenerating, setIsGenerating };
}
