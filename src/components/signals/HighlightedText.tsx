// Semantic underline highlights for agent narrative – light theme
interface HighlightedTextProps {
  children: React.ReactNode;
  type?: 'signal' | 'opportunity' | 'threat' | 'deadline';
}

const highlightColors = {
  signal: '#c4493e',
  opportunity: '#3a9a5c',
  threat: '#d04040',
  deadline: '#b8921e',
};

export function HL({ children, type = 'signal' }: HighlightedTextProps) {
  const color = highlightColors[type] || highlightColors.signal;
  return (
    <span
      style={{
        color: 'hsl(235, 25%, 12%)',
        borderBottom: `2px solid ${color}66`,
        paddingBottom: 1,
      }}
    >
      {children}
    </span>
  );
}

export function ColorLegend({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  const items = [
    { label: 'Market move', color: '#c4493e' },
    { label: 'Opportunity', color: '#3a9a5c' },
    { label: 'Threat', color: '#d04040' },
    { label: 'Deadline', color: '#b8921e' },
  ];

  const lineWidth = size === 'small' ? 12 : 14;
  const gap = size === 'small' ? 12 : 18;

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
          <span style={{ fontSize: '9px', fontWeight: 400, color: 'hsl(235, 10%, 46%)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
