import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, transition } from '../design-tokens';

const FONT = typography.fontFamily;

interface RawBrandProfile {
  strategic_bets: string[];
  active_commitments: string[];
  brand_constraints: string[];
  user_corrections: Record<string, string>;
  brand_name: string;
  updated_at: string;
}

type SectionKey = 'strategic_bets' | 'active_commitments' | 'brand_constraints';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'strategic_bets', label: 'STRATEGIC PRIORITIES' },
  { key: 'active_commitments', label: 'ACTIVE COMMITMENTS' },
  { key: 'brand_constraints', label: 'BRAND CONSTRAINTS' },
];

function applyCorrections(
  facts: string[],
  corrections: Record<string, string>,
): string[] {
  return facts
    .map(fact => {
      const corrected = corrections[fact];
      if (corrected === undefined) return fact;
      if (corrected === '') return null;
      return corrected;
    })
    .filter(Boolean) as string[];
}

export default function SettingsBrand() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [raw, setRaw] = useState<RawBrandProfile | null>(null);
  const [sections, setSections] = useState<Record<SectionKey, string[]>>({
    strategic_bets: [],
    active_commitments: [],
    brand_constraints: [],
  });
  const [newItems, setNewItems] = useState<Record<SectionKey, string[]>>({
    strategic_bets: [],
    active_commitments: [],
    brand_constraints: [],
  });
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingValue, setEditingValue] = useState('');
  const [userId, setUserId] = useState('');
  const [researching, setResearching] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/feed'); return; }
      setUserId(user.id);

      const { data, error } = await (supabase as any)
        .from('brand_profiles')
        .select('strategic_bets, active_commitments, brand_constraints, user_corrections, brand_name, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const corrections = data.user_corrections || {};
      setRaw(data as RawBrandProfile);
      setSections({
        strategic_bets: applyCorrections(data.strategic_bets || [], corrections),
        active_commitments: applyCorrections(data.active_commitments || [], corrections),
        brand_constraints: applyCorrections(data.brand_constraints || [], corrections),
      });
      setLoading(false);
    })();
  }, [navigate]);

  const startEdit = (key: SectionKey, index: number, value: string) => {
    setEditingSection(key);
    setEditingIndex(index);
    setEditingValue(value);
  };

  const commitEdit = (key: SectionKey, index: number) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      setSections(prev => ({
        ...prev,
        [key]: prev[key].map((f, i) => i === index ? trimmed : f),
      }));
    }
    setEditingSection(null);
    setEditingIndex(-1);
    setEditingValue('');
  };

  const deleteFact = (key: SectionKey, index: number) => {
    setSections(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const addFact = (key: SectionKey) => {
    const placeholder = 'New item';
    setSections(prev => ({
      ...prev,
      [key]: [...prev[key], placeholder],
    }));
    setNewItems(prev => ({
      ...prev,
      [key]: [...prev[key], placeholder],
    }));
    // Start editing the new item immediately
    setTimeout(() => {
      startEdit(key, sections[key].length, placeholder);
    }, 0);
  };

  const buildCorrections = (): Record<string, string> => {
    if (!raw) return {};
    const corrections: Record<string, string> = { ...(raw.user_corrections || {}) };

    for (const { key } of SECTIONS) {
      const rawFacts = raw[key] || [];
      const edited = sections[key];

      // Find deletions
      for (const originalFact of rawFacts) {
        const correctedOriginal = (raw.user_corrections || {})[originalFact];
        const displayFact =
          correctedOriginal !== undefined && correctedOriginal !== ''
            ? correctedOriginal
            : correctedOriginal === '' ? null : originalFact;

        if (displayFact === null) continue;
        if (!edited.includes(displayFact)) {
          corrections[originalFact] = '';
        }
      }

      // Find edits
      const displayedFacts = applyCorrections(rawFacts, raw.user_corrections || {});
      displayedFacts.forEach((displayFact, i) => {
        const editedFact = edited[i];
        if (editedFact && editedFact !== displayFact) {
          const originalKey = rawFacts.find(f => {
            const c = (raw.user_corrections || {})[f];
            return (c === undefined ? f : c) === displayFact;
          });
          if (originalKey) {
            corrections[originalKey] = editedFact;
          }
        }
      });
    }

    return corrections;
  };

  const handleSave = async () => {
    if (!raw || !userId) return;
    setSaving(true);

    const corrections = buildCorrections();

    // Separate truly new items (not from raw arrays)
    const displayedCounts = {
      strategic_bets: applyCorrections(raw.strategic_bets || [], raw.user_corrections || {}).length,
      active_commitments: applyCorrections(raw.active_commitments || [], raw.user_corrections || {}).length,
      brand_constraints: applyCorrections(raw.brand_constraints || [], raw.user_corrections || {}).length,
    };

    const appendItems: Record<SectionKey, string[]> = {
      strategic_bets: [],
      active_commitments: [],
      brand_constraints: [],
    };

    for (const { key } of SECTIONS) {
      const extras = sections[key].slice(displayedCounts[key]);
      appendItems[key] = extras.filter(e => e !== 'New item' && e.trim() !== '');
    }

    const updatePayload: any = {
      user_corrections: corrections,
      confirmed_by_user_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (appendItems.strategic_bets.length > 0) {
      updatePayload.strategic_bets = [...(raw.strategic_bets || []), ...appendItems.strategic_bets];
    }
    if (appendItems.active_commitments.length > 0) {
      updatePayload.active_commitments = [...(raw.active_commitments || []), ...appendItems.active_commitments];
    }
    if (appendItems.brand_constraints.length > 0) {
      updatePayload.brand_constraints = [...(raw.brand_constraints || []), ...appendItems.brand_constraints];
    }

    const { error } = await (supabase as any)
      .from('brand_profiles')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('brand_name', raw.brand_name);

    if (error) {
      console.error('[SettingsBrand] Save failed:', error);
    } else {
      // Reload fresh data
      const { data } = await (supabase as any)
        .from('brand_profiles')
        .select('strategic_bets, active_commitments, brand_constraints, user_corrections, brand_name, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const corr = data.user_corrections || {};
        setRaw(data as RawBrandProfile);
        setSections({
          strategic_bets: applyCorrections(data.strategic_bets || [], corr),
          active_commitments: applyCorrections(data.active_commitments || [], corr),
          brand_constraints: applyCorrections(data.brand_constraints || [], corr),
        });
        setNewItems({ strategic_bets: [], active_commitments: [], brand_constraints: [] });
      }
    }

    setSaving(false);
  };

  const handleReResearch = async () => {
    if (!raw || !userId) return;
    const scanUrl = import.meta.env.VITE_MODAL_ONBOARDING_SCAN_URL;
    if (!scanUrl) return;

    setResearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await (supabase as any)
        .from('users')
        .select('company, role')
        .eq('id', user.id)
        .maybeSingle();

      await fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          brand_name: userData?.company || raw.brand_name,
          role: userData?.role || '',
        }),
      });

      // Reload brand profile after scan
      const { data } = await (supabase as any)
        .from('brand_profiles')
        .select('strategic_bets, active_commitments, brand_constraints, user_corrections, brand_name, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const corr = data.user_corrections || {};
        setRaw(data as RawBrandProfile);
        setSections({
          strategic_bets: applyCorrections(data.strategic_bets || [], corr),
          active_commitments: applyCorrections(data.active_commitments || [], corr),
          brand_constraints: applyCorrections(data.brand_constraints || [], corr),
        });
        setNewItems({ strategic_bets: [], active_commitments: [], brand_constraints: [] });
      }
    } catch (err) {
      console.error('[SettingsBrand] Re-research failed:', err);
    } finally {
      setResearching(false);
    }
  };

  const updatedLabel = raw?.updated_at
    ? `Updated ${new Date(raw.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : '';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <span style={{ color: colors.text.muted.light, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!raw) {
    return (
      <div style={{ minHeight: '100vh', padding: '60px 32px', fontFamily: FONT, maxWidth: 600, margin: '0 auto' }}>
        <button onClick={() => navigate('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: colors.text.muted.light, marginBottom: 32, fontFamily: FONT }}>
          &larr; Back
        </button>
        <p style={{ color: colors.text.secondary.light, fontSize: 14 }}>No brand profile yet. Complete onboarding first.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 120px' }}>
        {/* Back */}
        <button
          onClick={() => navigate('/feed')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: colors.text.muted.light, fontFamily: FONT,
            marginBottom: 32, padding: 0,
          }}
        >
          &larr; Back
        </button>

        {/* Header */}
        <p style={{
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: colors.text.muted.light, marginBottom: 8,
        }}>
          WHAT AUO KNOWS ABOUT {(raw.brand_name || '').toUpperCase()}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text.primary.light, marginBottom: 6 }}>
          Brand context
        </h1>
        <p style={{ fontSize: 13, color: colors.text.secondary.light, marginBottom: 4 }}>
          This shapes every insight AUO generates for you.
        </p>
        {updatedLabel && (
          <p style={{ fontSize: 12, color: colors.text.muted.light, marginBottom: 36 }}>
            {updatedLabel}
          </p>
        )}

        {/* Sections */}
        {SECTIONS.map(({ key, label }) => {
          const items = sections[key];
          return (
            <div key={key} style={{ marginBottom: 36 }}>
              <p style={{
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: colors.text.muted.light, marginBottom: 12,
              }}>
                {label}
              </p>
              {items.map((fact, i) => (
                <div
                  key={`${key}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '12px 0', borderBottom: `1px solid ${colors.border?.light || '#f0f0f0'}`,
                  }}
                >
                  {editingSection === key && editingIndex === i ? (
                    <input
                      autoFocus
                      style={{
                        flex: 1, fontSize: 14, fontFamily: FONT,
                        border: 'none', borderBottom: `1px solid ${colors.text.muted.light}`,
                        outline: 'none', paddingBottom: 2, color: colors.text.primary.light,
                        background: 'transparent',
                      }}
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={() => commitEdit(key, i)}
                      onKeyDown={e => e.key === 'Enter' && commitEdit(key, i)}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 14, color: colors.text.primary.light, lineHeight: 1.5 }}>
                      {fact}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginLeft: 16, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(key, i, fact)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 12, color: colors.text.muted.light, fontFamily: FONT,
                        transition: transition.fast, padding: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = colors.text.primary.light)}
                      onMouseLeave={e => (e.currentTarget.style.color = colors.text.muted.light)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteFact(key, i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 14, color: '#ccc', fontFamily: FONT,
                        transition: transition.fast, padding: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addFact(key)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: colors.text.muted.light, fontFamily: FONT,
                  marginTop: 8, padding: 0, transition: transition.fast,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.text.primary.light)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.text.muted.light)}
              >
                + Add
              </button>
            </div>
          );
        })}

        {/* Re-research */}
        <button
          onClick={handleReResearch}
          disabled={researching}
          style={{
            background: 'none', border: 'none', cursor: researching ? 'default' : 'pointer',
            fontSize: 13, color: colors.text.secondary.light, fontFamily: FONT,
            padding: 0, marginTop: 8, transition: transition.fast,
          }}
        >
          {researching ? 'Researching...' : `Re-research ${raw.brand_name} \u2192`}
        </button>
      </div>

      {/* Sticky save */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', background: colors.bg.light,
        borderTop: `1px solid ${colors.border?.light || '#f0f0f0'}`,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', background: colors.text.primary.light,
              color: colors.text.primary.dark, border: 'none', borderRadius: 4,
              padding: '13px 0', fontSize: 13, letterSpacing: '0.08em',
              cursor: saving ? 'default' : 'pointer', fontFamily: FONT,
              opacity: saving ? 0.6 : 1, transition: transition.fast,
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
