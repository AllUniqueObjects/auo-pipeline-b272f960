// Swiss-style cluster colors – adjusted for light theme
export const clusterColors = [
  {
    name: 'coral',
    fill: 'rgba(220,90,80,0.06)',
    node: 'rgba(220,90,80,0.5)',
    nodeUrgent: 'rgba(220,90,80,0.8)',
    text: '#c4493e',
  },
  {
    name: 'lavender',
    fill: 'rgba(120,90,200,0.06)',
    node: 'rgba(120,90,200,0.5)',
    nodeUrgent: 'rgba(120,90,200,0.8)',
    text: '#7a5ac8',
  },
  {
    name: 'sage',
    fill: 'rgba(60,160,100,0.06)',
    node: 'rgba(60,160,100,0.5)',
    nodeUrgent: 'rgba(60,160,100,0.8)',
    text: '#3a9a5c',
  },
  {
    name: 'gold',
    fill: 'rgba(200,160,50,0.06)',
    node: 'rgba(200,160,50,0.5)',
    nodeUrgent: 'rgba(200,160,50,0.8)',
    text: '#b8921e',
  },
  {
    name: 'slate',
    fill: 'rgba(90,105,135,0.06)',
    node: 'rgba(90,105,135,0.5)',
    nodeUrgent: 'rgba(90,105,135,0.8)',
    text: '#5a6987',
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
  return 'rgba(140,140,160,0.15)';
}
