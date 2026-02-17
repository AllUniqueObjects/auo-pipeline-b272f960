import { useState } from 'react';

export interface Assumption {
  text: string;
  checked: boolean;
}

export interface InvestigationNote {
  insightId: string;
  userNotes: string;
  assumptions: Assumption[];
  recommendedAction: string;
}

export function getDefaultAssumptions(insightId: string): Assumption[] {
  const DEFAULTS: Record<string, Assumption[]> = {
    '1': [
      { text: 'Supreme Court ruling will land after BOM lock deadline', checked: true },
      { text: 'Vietnam FOB at $18.40 is the floor, not the ceiling', checked: false },
      { text: 'Maine expansion timeline holds at 18 months', checked: true },
    ],
    '2': [
      { text: 'Foot Locker leadership vacuum persists through March', checked: true },
      { text: "Dick's will consolidate vendor count during integration", checked: false },
      { text: 'Nike wholesale flood hits Q2, not Q1', checked: true },
    ],
  };
  return DEFAULTS[insightId] || [
    { text: 'Key assumption about timing', checked: false },
    { text: 'Key assumption about competitive response', checked: false },
  ];
}

export function useInvestigationNote(insightId: string) {
  const [note, setNote] = useState<InvestigationNote>({
    insightId,
    userNotes: '',
    assumptions: getDefaultAssumptions(insightId),
    recommendedAction: '',
  });

  return [note, setNote] as const;
}
