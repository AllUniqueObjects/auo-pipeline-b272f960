// Shared position section types and parser

export interface KeyNumber {
  value: string;
  label: string;
}

export interface SignalSource {
  name: string;
  url: string;
  date?: string | null;
}

export interface SignalEvidence {
  title: string;
  credibility: number;
  one_liner: string;
  sources?: SignalSource[];
}

export interface PositionSections {
  key_numbers?: KeyNumber[];
  memo?: string;
  signal_evidence?: SignalEvidence[];
}

export interface LegacySection {
  title: string;
  content: string;
  signal_refs?: string[];
}

export function parseSections(raw: unknown): { parsed: PositionSections | null; legacy: LegacySection[] | null } {
  if (!raw) return { parsed: null, legacy: null };

  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return { parsed: null, legacy: null }; }
  }

  // Legacy: array of {title, content}
  if (Array.isArray(obj)) {
    return { parsed: null, legacy: obj as LegacySection[] };
  }

  // New format: object with key_numbers, memo, signal_evidence
  if (typeof obj === 'object' && obj !== null) {
    return { parsed: obj as PositionSections, legacy: null };
  }

  return { parsed: null, legacy: null };
}
