export interface Skin { id: string; name: string; c?: string; h?: string; crown?: boolean }
export const SKW: Skin[] = [
  { id: 'natural', name: 'Natural' },
  { id: 'obsidiana', name: 'Obsidiana', c: '#22222e', h: '#0b0b12' },
  { id: 'ambar', name: 'Âmbar', c: '#e3a434', h: '#9a6010' },
  { id: 'esmeralda', name: 'Esmeralda', c: '#2f9e6a', h: '#17603e' },
  { id: 'fantasma', name: 'Fantasma', c: '#dfe3ee', h: '#9aa0b4' },
];
export const SKQ: Skin[] = [
  { id: 'natural', name: 'Natural' },
  { id: 'dourada', name: 'Real dourada', c: '#e2b23a', h: '#8a6512', crown: true },
  { id: 'rubi', name: 'Rubi', c: '#c0233b', h: '#6e0f1f' },
  { id: 'cristal', name: 'Cristal', c: '#9fd8f0', h: '#4f8fb0' },
];
