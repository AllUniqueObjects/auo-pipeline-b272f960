import { useState, useEffect, useCallback } from 'react';
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

interface ExtractedContext {
  strategic_bets: string[];
  active_commitments: string[];
  brand_constraints: string[];
  source_summary: string;
}

type SectionKey = 'strategic_bets' | 'active_commitments' | 'brand_constraints';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'strategic_bets', label: 'STRATEGIC PRIORITIES' },
  { key: 'active_commitments', label: 'ACTIVE COMMITMENTS' },
  { key: 'brand_constraints', label: 'BRAND CONSTRAINTS' },
];

const PREVIEW_LABELS: Record<SectionKey, string> = {
  strategic_bets: 'Strategic Priorities',
  active_commitments: 'Active Commitments',
  brand_constraints: 'Brand Constraints',
};

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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

const extractFileText = async (file: File): Promise<{ text?: string; base64?: string; type: string }> => {
  if (file.type === 'application/pdf') {
    const base64 = await fileToBase64(file);
    return { base64, type: 'pdf' };
  }
  if (file.name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value, type: 'text' };
  }
  const text = await file.text();
  return { text, type: 'text' };
};

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

  // Extract context state
  const [contextInput, setContextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExtractedContext | null>(null);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const applyData = useCallback((data: any) => {
    const corr = data.user_corrections || {};
    setRaw(data as RawBrandProfile);
    setSections({
      strategic_bets: applyCorrections(data.strategic_bets || [], corr),
      active_commitments: applyCorrections(data.active_commitments || [], corr),
      brand_constraints: applyCorrections(data.brand_constraints || [], corr),
    });
    setNewItems({ strategic_bets: [], active_commitments: [], brand_constraints: [] });
  }, []);

  const loadBrandProfile = useCallback(async (uid?: string) => {
    const id = uid || userId;
    if (!id) return;
    const { data } = await (supabase as any)
      .from('brand_profiles')
      .select('strategic_bets, active_commitments, brand_constraints, user_corrections, brand_name, updated_at')
      .eq('user_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) applyData(data);
  }, [userId, applyData]);

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

      applyData(data);
      setLoading(false);
    })();
  }, [navigate, applyData]);

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
      await loadBrandProfile();
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

      await loadBrandProfile();
    } catch (err) {
      console.error('[SettingsBrand] Re-research failed:', err);
    } finally {
      setResearching(false);
    }
  };

  // ── Extract brand context ──────────────────────────────────────────────────

  const handleExtract = async () => {
    if (!contextInput.trim() && !uploadedFile) return;

    setExtracting(true);
    setExtractError(null);
    setPreview(null);

    try {
      const body: Record<string, any> = {
        user_id: userId,
        brand_name: raw?.brand_name || '',
      };

      if (uploadedFile) {
        const extracted = await extractFileText(uploadedFile);
        if (extracted.type === 'pdf' && extracted.base64) {
          body.file_content = extracted.base64;
          body.file_type = 'pdf';
        } else {
          body.text = extracted.text;
          body.file_type = 'text';
        }
        if (contextInput.trim()) {
          body.text = (body.text || '') + '\n\n' + contextInput.trim();
        }
      } else {
        body.text = contextInput.trim();
      }

      const extractUrl = import.meta.env.VITE_MODAL_EXTRACT_BRAND_CONTEXT_URL;
      if (!extractUrl) throw new Error('Extract endpoint not configured');

      const res = await fetch(extractUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const totalFacts =
        (data.strategic_bets?.length || 0) +
        (data.active_commitments?.length || 0) +
        (data.brand_constraints?.length || 0);

      if (totalFacts === 0) {
        throw new Error('No brand facts found — try adding more specific content.');
      }

      setPreview(data);
    } catch (e: any) {
      setExtractError(e.message || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmExtraction = async () => {
    if (!preview || !raw) return;
    setConfirmingSave(true);

    try {
      const { error } = await (supabase as any)
        .from('brand_profiles')
        .update({
          strategic_bets: [...(raw.strategic_bets || []), ...preview.strategic_bets],
          active_commitments: [...(raw.active_commitments || []), ...preview.active_commitments],
          brand_constraints: [...(raw.brand_constraints || []), ...preview.brand_constraints],
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('brand_name', raw.brand_name);

      if (error) throw error;

      setPreview(null);
      setContextInput('');
      setUploadedFile(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadBrandProfile();
    } catch (e: any) {
      setExtractError(e.message || 'Save failed');
    } finally {
      setConfirmingSave(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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

        {/* ── Add more context ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: 40, paddingTop: 32,
          borderTop: `1px solid ${colors.border?.light || '#f0f0f0'}`,
        }}>
          <p style={{
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: colors.text.muted.light, marginBottom: 4,
          }}>
            ADD MORE CONTEXT
          </p>
          <p style={{ fontSize: 13, color: colors.text.secondary.light, marginBottom: 20 }}>
            Describe a priority, paste a brief, or upload a document.
            AUO will extract and categorize it automatically.
          </p>

          {/* Text input */}
          <textarea
            value={contextInput}
            onChange={e => setContextInput(e.target.value)}
            placeholder={`Tell AUO something about ${raw.brand_name || 'your brand'} \u2014 a strategic bet, commitment, or constraint...`}
            rows={4}
            style={{
              width: '100%', fontSize: 14, fontFamily: FONT,
              border: `1px solid ${colors.border?.medium || '#e0e0e0'}`,
              borderRadius: 12, padding: '12px 16px', resize: 'none',
              outline: 'none', color: colors.text.primary.light,
              lineHeight: 1.5, transition: transition.fast,
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = colors.text.muted.light)}
            onBlur={e => (e.currentTarget.style.borderColor = colors.border?.medium || '#e0e0e0')}
          />

          {/* File upload */}
          <div style={{ marginTop: 12 }}>
            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="file"
                accept=".pdf,.txt,.docx"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setUploadedFile(file);
                  e.target.value = '';
                }}
              />
              <span style={{ fontSize: 13, color: colors.text.muted.light, transition: transition.fast }}>
                {uploadedFile ? (
                  <span style={{ color: colors.text.primary.light }}>{uploadedFile.name}</span>
                ) : (
                  'Upload a file (PDF, DOCX, TXT)'
                )}
              </span>
            </label>
            {uploadedFile && (
              <button
                onClick={() => setUploadedFile(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#ccc', marginLeft: 8, fontFamily: FONT,
                }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Extract button */}
          <button
            onClick={handleExtract}
            disabled={extracting || (!contextInput.trim() && !uploadedFile)}
            style={{
              marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', background: colors.text.primary.light,
              color: colors.text.primary.dark, border: 'none', borderRadius: 12,
              fontSize: 13, fontFamily: FONT, cursor: extracting || (!contextInput.trim() && !uploadedFile) ? 'default' : 'pointer',
              opacity: extracting || (!contextInput.trim() && !uploadedFile) ? 0.4 : 1,
              transition: transition.fast,
            }}
          >
            {extracting ? 'Analyzing...' : 'Extract brand context \u2192'}
          </button>

          {/* Error */}
          {extractError && (
            <p style={{ marginTop: 12, fontSize: 13, color: '#ef4444' }}>{extractError}</p>
          )}

          {/* Success */}
          {saveSuccess && (
            <p style={{ marginTop: 12, fontSize: 13, color: '#22c55e' }}>
              Added to your brand context
            </p>
          )}
        </div>

        {/* ── Preview ────────────────────────────────────────────────────── */}
        {preview && (
          <div style={{
            marginTop: 24, border: `1px solid ${colors.border?.medium || '#e0e0e0'}`,
            borderRadius: 16, padding: 24,
          }}>
            {preview.source_summary && (
              <p style={{ fontSize: 11, color: colors.text.muted.light, marginBottom: 4 }}>
                {preview.source_summary}
              </p>
            )}
            <p style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary.light, marginBottom: 16 }}>
              Found {
                preview.strategic_bets.length +
                preview.active_commitments.length +
                preview.brand_constraints.length
              } facts &mdash; add these to your brand context?
            </p>

            {(SECTIONS.map(({ key }) => ({
              label: PREVIEW_LABELS[key],
              items: preview[key] || [],
              key,
            }))).map(({ label, items, key }) =>
              items.length > 0 ? (
                <div key={key} style={{ marginBottom: 20 }}>
                  <p style={{
                    fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: colors.text.muted.light, marginBottom: 8,
                  }}>
                    {label}
                  </p>
                  {items.map((fact, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 14, color: colors.text.secondary.light,
                        padding: '10px 0',
                        borderBottom: i < items.length - 1 ? `1px solid ${colors.border?.light || '#f0f0f0'}` : 'none',
                      }}
                    >
                      {fact}
                    </div>
                  ))}
                </div>
              ) : null
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={handleConfirmExtraction}
                disabled={confirmingSave}
                style={{
                  flex: 1, padding: '10px 0', background: colors.text.primary.light,
                  color: colors.text.primary.dark, border: 'none', borderRadius: 12,
                  fontSize: 13, fontFamily: FONT,
                  cursor: confirmingSave ? 'default' : 'pointer',
                  opacity: confirmingSave ? 0.5 : 1, transition: transition.fast,
                }}
              >
                {confirmingSave ? 'Saving...' : 'Add to brand context'}
              </button>
              <button
                onClick={() => setPreview(null)}
                style={{
                  padding: '10px 20px', fontSize: 13, fontFamily: FONT,
                  color: colors.text.secondary.light,
                  border: `1px solid ${colors.border?.medium || '#e0e0e0'}`,
                  borderRadius: 12, background: 'transparent', cursor: 'pointer',
                  transition: transition.fast,
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Re-research */}
        <button
          onClick={handleReResearch}
          disabled={researching}
          style={{
            background: 'none', border: 'none', cursor: researching ? 'default' : 'pointer',
            fontSize: 13, color: colors.text.secondary.light, fontFamily: FONT,
            padding: 0, marginTop: 32, transition: transition.fast,
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
