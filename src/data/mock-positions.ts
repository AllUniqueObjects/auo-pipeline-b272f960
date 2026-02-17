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
