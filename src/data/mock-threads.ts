export interface ThreadParticipant {
  id: string;
  name: string;
  role: 'owner' | 'invited' | 'monitoring';
  avatar?: string;
  initials: string;
  color: string;
}

export interface ThreadMessage {
  id: string;
  participant_id: string;
  content: string;
  timestamp: string;
  signal_ref?: { id: string; title: string };
}

export interface ThreadUpdate {
  id: string;
  type: 'signal_update' | 'new_signal';
  title: string;
  description: string;
  timestamp: string;
}

export interface MockThread {
  id: string;
  insight_id: string;
  decision_title: string;
  participants: ThreadParticipant[];
  messages: ThreadMessage[];
  updates: ThreadUpdate[];
  created_at: string;
}

export interface ShareRecipientOption {
  id: string;
  label: string;
  description: string;
}

export interface ShareIntentOption {
  id: string;
  label: string;
  description: string;
  tags: string[];
  icon: 'align' | 'decision' | 'input' | 'inform';
}

export const RECIPIENT_OPTIONS: ShareRecipientOption[] = [
  { id: 'executive', label: 'Executive Leadership', description: 'C-suite, VPs, senior decision-makers' },
  { id: 'working', label: 'Working Team', description: 'Direct reports, cross-functional partners' },
  { id: 'external', label: 'External Stakeholder', description: 'Clients, partners, board members' },
  { id: 'advisory', label: 'Advisory', description: 'Consultants, mentors, subject matter experts' },
];

export const INTENT_OPTIONS: ShareIntentOption[] = [
  {
    id: 'align',
    label: 'Align on Direction',
    description: 'Build shared understanding before taking action',
    tags: ['Position summary', 'Signal contributions', 'Key assumptions', 'Open questions'],
    icon: 'align',
  },
  {
    id: 'decision',
    label: 'Request Decision',
    description: 'Seek approval or final call on the recommended path',
    tags: ['Clear recommendation', 'Trade-offs accepted', 'Risks & mitigations', 'Timeline pressure'],
    icon: 'decision',
  },
  {
    id: 'input',
    label: 'Gather Input',
    description: 'Collect feedback, challenge assumptions, refine thinking',
    tags: ['Working hypothesis', 'Areas of uncertainty', 'Specific questions', 'What almost broke'],
    icon: 'input',
  },
  {
    id: 'inform',
    label: 'Inform & Update',
    description: 'Share findings without requiring action',
    tags: ['Executive summary', 'Key findings', 'Implications', 'Next steps'],
    icon: 'inform',
  },
];

export const FORMAT_OPTIONS = ['Quick', 'Email', 'Notes', 'One-pager'] as const;

export const MOCK_THREAD: MockThread = {
  id: 'thread-001',
  insight_id: '1',
  decision_title: 'Lock Vietnam FOB contracts at $18.40/pair before FW26 BOM deadline',
  participants: [
    { id: 'user-1', name: 'You', role: 'owner', initials: 'D', color: 'bg-orange-500' },
    { id: 'user-2', name: 'Working Team', role: 'invited', initials: 'W', color: 'bg-muted' },
    { id: 'auo', name: 'AUO', role: 'monitoring', initials: '✦', color: 'bg-primary' },
  ],
  messages: [
    {
      id: 'tm-1',
      participant_id: 'auo',
      content: "Welcome! I've shared this position with Working Team. They can see the full recommendation, evidence, and trade-offs here.\n\nI'll monitor the underlying signals and alert you both if anything changes.",
      timestamp: '11:35 AM',
    },
    {
      id: 'tm-2',
      participant_id: 'user-1',
      content: "Team, I want to align on the Vietnam FOB decision before we lock BOM. The $18.40/pair window closes in ~8 weeks and we won't have tariff clarity by then.",
      timestamp: '11:38 AM',
    },
    {
      id: 'tm-3',
      participant_id: 'user-2',
      content: "Makes sense. What's our downside if we lock now and tariffs don't materialize? Are we overpaying vs. spot?",
      timestamp: '11:42 AM',
    },
    {
      id: 'tm-4',
      participant_id: 'auo',
      content: "Relevant data point: Current Vietnam FOB at $18.40 is already 7-8% above last year due to labor inflation. If tariffs don't land, you're paying inflation-adjusted fair price. If they do land at 20-25%, you'd save $3.60-4.60/pair by locking now.",
      timestamp: '11:43 AM',
      signal_ref: { id: 'scan-003', title: 'US Tariff Policy Creates 2026 Overhang' },
    },
    {
      id: 'tm-5',
      participant_id: 'user-2',
      content: "That's a strong asymmetric bet. What about the Maine expansion as a hedge?",
      timestamp: '11:46 AM',
    },
    {
      id: 'tm-6',
      participant_id: 'auo',
      content: "Maine expansion reaches 35-40% domestic capacity by FW27 — 18-month build timeline. It doesn't help FW26 BOM but creates a structural hedge for FW27+.",
      timestamp: '11:47 AM',
      signal_ref: { id: 'scan-004', title: 'Vietnam Labor Costs Rising' },
    },
  ],
  updates: [
    {
      id: 'update-1',
      type: 'signal_update',
      title: 'Supreme Court tariff hearing date moved to March 15',
      description: 'Timeline shifted 2 weeks earlier — may provide partial clarity before BOM lock.',
      timestamp: '2h ago',
    },
  ],
  created_at: '2026-02-16T11:35:00Z',
};

export const MOCK_QUICK_QUESTIONS = [
  "What's the strongest evidence supporting this?",
  "What are the main risks?",
  "Who else should review this?",
  "What would change this position?",
];

export function generateShareMessage(
  recipientLabel: string,
  intentLabel: string,
  brief?: { title: string; sections: { label: string; content: string; items?: string[] }[] },
): string {
  if (!brief) {
    return `Hey ${recipientLabel},

I've been working through a strategic decision and put together a recommendation I'd like to share with you.

I'd love to get your take before we move forward.

— David`;
  }

  let sectionsText = '';
  for (const section of brief.sections) {
    sectionsText += `\n${section.label.toUpperCase()}\n`;
    if (section.content) {
      sectionsText += `${section.content}\n`;
    }
    if (section.items && section.items.length > 0) {
      for (const item of section.items) {
        sectionsText += `• ${item}\n`;
      }
    }
  }

  return `Subject: Decision thread: ${brief.title}

Hey ${recipientLabel},

I've been working through a strategic decision and put together a recommendation I'd like to share with you.

POSITION: ${brief.title}
${sectionsText}
I'd love to get your take before we move forward.

— David`;
}
