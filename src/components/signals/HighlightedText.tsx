// Semantic underline highlights for agent narrative
// Colors from handoff: coral (signal), green (opportunity), red (threat), gold (deadline)

interface HighlightedTextProps {
  children: React.ReactNode;
  type?: 'signal' | 'opportunity' | 'threat' | 'deadline';
}

const highlightColors = {
  signal: '#f4a3a0',      // coral - market moves
  opportunity: '#a8d5ba', // green - opportunities
  threat: '#e87070',      // red - competitive threats
  deadline: '#e8d5a3',    // gold - deadlines, numbers
};

export function HL({ children, type = 'signal' }: HighlightedTextProps) {
  const color = highlightColors[type] || highlightColors.signal;
  
  return (
    <span
      style={{
        color: '#e8e8ed',
        borderBottom: `2px solid ${color}88`,
        paddingBottom: 1,
      }}
    >
      {children}
    </span>
  );
}

export function ColorLegend({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  const items = [
    { label: 'Market move', color: '#f4a3a0' },
    { label: 'Opportunity', color: '#a8d5ba' },
    { label: 'Threat', color: '#e87070' },
    { label: 'Deadline', color: '#e8d5a3' },
  ];

  const fontSize = size === 'small' ? '9px' : '9px';
  const gap = size === 'small' ? 12 : 18;
  const lineWidth = size === 'small' ? 12 : 14;

  return (
    <div style={{ display: 'flex', gap, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            style={{
              width: lineWidth,
              height: 2,
              background: item.color,
              opacity: 0.7,
              borderRadius: 1,
            }}
          />
          <span style={{ fontSize, fontWeight: 400, color: '#55555f' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
