import { useState } from 'react';
import { Users, Target, Send, Check, ArrowRight, Copy, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RECIPIENT_OPTIONS,
  INTENT_OPTIONS,
  FORMAT_OPTIONS,
  generateShareMessage,
  type ShareIntentOption,
} from '@/data/mock-threads';
import { MOCK_INSIGHTS } from '@/data/mock';

type Step = 'recipient' | 'intent' | 'review';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'recipient', label: 'Recipient', icon: <Users className="h-3.5 w-3.5" /> },
  { key: 'intent', label: 'Intent', icon: <Target className="h-3.5 w-3.5" /> },
  { key: 'review', label: 'Review & Send', icon: <Send className="h-3.5 w-3.5" /> },
];

interface ShareWizardViewProps {
  insightIds: string[];
  onBack: () => void;
  onOpenThread: () => void;
  userNotes?: string;
  assumptions?: { text: string; checked: boolean }[];
  recommendedAction?: string;
}

export function ShareWizardView({ insightIds, onBack, onOpenThread, userNotes, assumptions, recommendedAction }: ShareWizardViewProps) {
  const insightId = insightIds[0];
  const insight = MOCK_INSIGHTS.find(i => i.id === insightId);
  const [step, setStep] = useState<Step>('recipient');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [personalNote, setPersonalNote] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('Email');
  const [copied, setCopied] = useState(false);

  const currentStepIdx = STEPS.findIndex(s => s.key === step);
  const recipientLabel = RECIPIENT_OPTIONS.find(r => r.id === selectedRecipient)?.label || recipientName || 'Team';
  const intentLabel = INTENT_OPTIONS.find(i => i.id === selectedIntent)?.label || '';
  const decisionTitle = insight?.title || '';

  let messageText = generateShareMessage(recipientLabel, intentLabel, decisionTitle);

  // Append David's Take if notes exist
  const hasUserContext = userNotes?.trim() || recommendedAction?.trim() || assumptions?.some(a => a.checked);
  if (hasUserContext) {
    let takeSection = '\n\n---\n**David\'s Take**\n';
    if (userNotes?.trim()) {
      takeSection += `\n${userNotes.trim()}\n`;
    }
    const checkedAssumptions = assumptions?.filter(a => a.checked);
    if (checkedAssumptions && checkedAssumptions.length > 0) {
      takeSection += '\nKey assumptions:\n';
      checkedAssumptions.forEach(a => {
        takeSection += `• ${a.text}\n`;
      });
    }
    if (recommendedAction?.trim()) {
      takeSection += `\nRecommended action: ${recommendedAction.trim()}`;
    }
    messageText += takeSection;
  }

  const canProceed = () => {
    if (step === 'recipient') return !!selectedRecipient;
    if (step === 'intent') return !!selectedIntent;
    return true;
  };

  const nextStep = () => {
    if (step === 'recipient') setStep('intent');
    else if (step === 'intent') setStep('review');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onOpenThread();
    }, 800);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground">Get others on board</h1>
          <p className="text-sm text-muted-foreground">Craft a message that lands with your audience</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const done = i < currentStepIdx;
            const active = s.key === step;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <button
                  onClick={() => done && setStep(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    active && 'bg-primary text-primary-foreground',
                    done && 'bg-transparent border border-primary text-primary cursor-pointer',
                    !active && !done && 'text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : s.icon}
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-8 h-px', done ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {step === 'recipient' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-foreground">Who are you sharing this with?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RECIPIENT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedRecipient(opt.id)}
                  className={cn(
                    'text-left rounded-lg border p-4 transition-all',
                    selectedRecipient === opt.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-foreground font-medium">Add recipient name (optional)</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="e.g., Sarah Chen, Product Council..."
                className="mt-2 w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {step === 'intent' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-foreground">What do you need from {recipientLabel}?</h2>
            <div className="space-y-3">
              {INTENT_OPTIONS.map(opt => (
                <IntentCard
                  key={opt.id}
                  option={opt}
                  selected={selectedIntent === opt.id}
                  onSelect={() => setSelectedIntent(opt.id)}
                />
              ))}
            </div>
            <div>
              <label className="text-sm text-foreground font-medium">Add a personal note (optional)</label>
              <textarea
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
                placeholder="Add context, specific asks, or framing for this recipient..."
                rows={3}
                className="mt-2 w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Sharing with <span className="font-medium text-foreground">{recipientLabel}</span>
              {' · '}
              <span className="text-primary">{intentLabel}</span>
            </div>

            {/* Format selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Format:</span>
              {FORMAT_OPTIONS.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    selectedFormat === fmt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-foreground">Your message</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">editable</span>
              </div>
              <textarea
                defaultValue={messageText}
                rows={14}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
              <p className="text-xs text-muted-foreground mt-1">✏️ Edit anything above — this is exactly what will be copied</p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied! Opening thread...' : 'Copy message'}
            </button>
          </div>
        )}

        {/* Continue button (steps 1 & 2) */}
        {step !== 'review' && (
          <div className="flex justify-end mt-8">
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IntentCard({ option, selected, onSelect }: { option: ShareIntentOption; selected: boolean; onSelect: () => void }) {
  const ICONS: Record<string, string> = { align: '↗', decision: '✓', input: '◎', inform: '📄' };
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-4 transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-muted-foreground/40'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm">
          {ICONS[option.icon]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{option.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {option.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded bg-muted text-[11px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
