import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Signal = Tables<'signals'>;

export function useSignals() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSignals = async () => {
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSignals(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch signals'));
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('signals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSignals((prev) => [payload.new as Signal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSignals((prev) =>
              prev.map((s) => (s.id === (payload.new as Signal).id ? (payload.new as Signal) : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setSignals((prev) => prev.filter((s) => s.id !== (payload.old as Signal).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { signals, loading, error };
}

export function useSignal(id: string | undefined) {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchSignal = async () => {
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setSignal(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch signal'));
      } finally {
        setLoading(false);
      }
    };

    fetchSignal();
  }, [id]);

  return { signal, loading, error };
}
