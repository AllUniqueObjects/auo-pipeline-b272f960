// Swiss-style pastel cluster colors
export const clusterColors = [
  {
    name: 'coral',
    fill: 'rgba(244,163,160,0.06)',
    node: 'rgba(244,163,160,0.5)',
    nodeUrgent: 'rgba(244,163,160,0.8)',
    text: '#f4a3a0',
  },
  {
    name: 'lavender',
    fill: 'rgba(180,167,214,0.06)',
    node: 'rgba(180,167,214,0.5)',
    nodeUrgent: 'rgba(180,167,214,0.8)',
    text: '#b4a7d6',
  },
  {
    name: 'sage',
    fill: 'rgba(168,213,186,0.06)',
    node: 'rgba(168,213,186,0.5)',
    nodeUrgent: 'rgba(168,213,186,0.8)',
    text: '#a8d5ba',
  },
  {
    name: 'gold',
    fill: 'rgba(232,213,163,0.06)',
    node: 'rgba(232,213,163,0.5)',
    nodeUrgent: 'rgba(232,213,163,0.8)',
    text: '#e8d5a3',
  },
  {
    name: 'slate',
    fill: 'rgba(160,170,190,0.06)',
    node: 'rgba(160,170,190,0.5)',
    nodeUrgent: 'rgba(160,170,190,0.8)',
    text: '#a0aabe',
  },
];

export const standaloneColor = {
  node: 'rgba(107,107,123,0.4)',
  nodeUrgent: 'rgba(107,107,123,0.6)',
  text: '#6b6b7b',
};

export function getClusterColor(index: number) {
  return clusterColors[index % clusterColors.length];
}

// Blend two hex colors at 15% opacity for edge lines
export function blendColors(color1: string, color2: string): string {
  // Just return a very dim average - simplified approach
  return 'rgba(140,140,160,0.15)';
}
