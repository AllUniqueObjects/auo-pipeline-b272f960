import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Source {
  id: string;
  domain: string;
  scan_tier: 'breaking' | 'standard';
  category: string;
  is_default: boolean;
  added_by: 'system' | 'user' | 'agent';
  is_active: boolean;
  last_scanned_at: string | null;
  signal_count: number;
  suggested_reason: string | null;
  approved_at: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  policy: 'text-red-500',
  regulatory: 'text-red-500',
  market_dynamics: 'text-blue-500',
  industry: 'text-blue-500',
  consumer: 'text-emerald-500',
  competitor: 'text-amber-500',
  technology: 'text-violet-500',
  supply_chain: 'text-orange-500',
  innovation: 'text-cyan-500',
  custom: 'text-muted-foreground',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<Source[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('source_registry')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${user.id}`)
      .order('scan_tier', { ascending: false })
      .order('is_default', { ascending: false });

    if (data) {
      setSources(data.filter((s: Source) => s.is_active || s.is_default));
      setPendingSuggestions(data.filter((s: Source) => !s.is_active && s.added_by === 'agent'));
    }
  }

  async function addSource() {
    if (!newDomain.trim()) return;
    setAdding(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let domain = newDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    const { error: insertError } = await supabase
      .from('source_registry')
      .insert({
        domain,
        tier: 3,
        weight: 0.5,
        category: 'custom',
        label: domain.split('.')[0],
        notes: 'User-added source',
        scan_tier: 'standard',
        is_default: false,
        added_by: 'user',
        user_id: user.id,
        is_active: true,
      });

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'This source is already being tracked.'
          : 'Failed to add source. Try again.'
      );
    } else {
      setNewDomain('');
      loadSources();
    }
    setAdding(false);
  }

  async function removeSource(id: string) {
    await supabase.from('source_registry').delete().eq('id', id);
    loadSources();
  }

  async function approveSuggestion(source: Source) {
    await supabase
      .from('source_registry')
      .update({ is_active: true, approved_at: new Date().toISOString() })
      .eq('id', source.id);
    loadSources();
  }

  async function dismissSuggestion(id: string) {
    await supabase.from('source_registry').delete().eq('id', id);
    loadSources();
  }

  const breakingSources = sources.filter(s => s.scan_tier === 'breaking');
  const standardSources = sources.filter(s => s.scan_tier === 'standard');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 block"
          >
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-foreground">Alert Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AUO monitors these sources. Breaking sources are checked every 20 minutes.
          </p>
        </div>

        {/* Pending Suggestions */}
        {pendingSuggestions.length > 0 && (
          <div className="mb-8">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              AUO Suggests ({pendingSuggestions.length})
            </div>
            {pendingSuggestions.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 mb-2"
              >
                <div className="min-w-0 mr-3">
                  <div className="text-sm font-semibold text-foreground truncate">{s.domain}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.suggested_reason}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveSuggestion(s)}
                    className="text-xs font-medium bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => dismissSuggestion(s.id)}
                    className="text-xs font-medium text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:text-foreground transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Breaking Sources */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Breaking — every 20 min
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          {breakingSources.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No breaking sources configured.</p>
          )}
          {breakingSources.map(s => (
            <SourceRow
              key={s.id}
              source={s}
              onRemove={s.is_default ? undefined : () => removeSource(s.id)}
            />
          ))}
        </div>

        {/* Standard Sources */}
        <div className="mb-8">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Standard — 3× daily
          </div>
          {standardSources.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No standard sources.</p>
          )}
          {standardSources.map(s => (
            <SourceRow
              key={s.id}
              source={s}
              onRemove={s.is_default ? undefined : () => removeSource(s.id)}
            />
          ))}
        </div>

        {/* Add Source */}
        <div className="border-t border-border pt-6">
          <div className="text-sm font-semibold text-foreground mb-2.5">Add a source</div>
          <div className="flex gap-2">
            <input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSource()}
              placeholder="on-running.com or https://on-running.com/news"
              className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={addSource}
              disabled={adding || !newDomain.trim()}
              className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-default bg-foreground text-background hover:opacity-90"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Enter a domain or URL. AUO will include it in the standard scan cycle.
          </p>
        </div>
      </div>
    </div>
  );
}

function SourceRow({
  source,
  onRemove,
}: {
  source: Source;
  onRemove?: () => void;
}) {
  const colorClass = CATEGORY_COLORS[source.category] || 'text-muted-foreground';
  const label = source.category?.replace(/_/g, ' ') || 'custom';

  const meta: string[] = [];
  if (source.last_scanned_at) meta.push(`Scanned ${timeAgo(source.last_scanned_at)}`);
  else meta.push('Not yet scanned');
  if (source.signal_count > 0) meta.push(`${source.signal_count} signals`);
  if (source.is_default) meta.push('AUO default');

  return (
    <div className="flex items-center justify-between px-3.5 py-3 bg-background border border-border rounded-lg mb-1.5 hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-[10px] font-semibold uppercase tracking-wider min-w-[72px] ${colorClass}`}>
          {label}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{source.domain}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {meta.join(' · ')}
          </div>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground text-lg leading-none px-1 transition-colors flex-shrink-0"
          aria-label="Remove source"
        >
          ×
        </button>
      )}
    </div>
  );
}
