export interface Bg {
  id: string; cat: string; name: string;
  sky: string[]; // faixas de cima pra baixo
  cel: ['sun' | 'moon', number, number, string]; // tipo, x relativo, y, cor
  hills: [string, number, number][]; // cor, amplitude, topo
  props: string; // desenhista em render/backgrounds/
  grass: string;
  soil: [string, string, string, string]; // 4 camadas de terra
}
export const BGS: Bg[] = [
  { id: 'amanhecer', cat: 'Natureza', name: 'Campo ao amanhecer', sky: ['#f9d7a8', '#f4b183', '#e9927a', '#cf7a72'], cel: ['sun', 0.76, 13, '#fff3c4'], hills: [['#a87582', 0.6, 22], ['#6f8f4e', 0.9, 31]], props: 'flores', grass: '#5f8f3a', soil: ['#6b4429', '#5a3820', '#4b2e1a', '#3c2414'] },
  { id: 'floresta', cat: 'Natureza', name: 'Floresta', sky: ['#cfeaec', '#b2dde2', '#97cdd4'], cel: ['sun', 0.18, 10, '#fffbe0'], hills: [['#76a08f', 0.7, 20], ['#41704a', 1.2, 29]], props: 'arvores', grass: '#3e7a2f', soil: ['#4e3422', '#432c1c', '#382416', '#2c1c11'] },
  { id: 'cerrado', cat: 'Natureza', name: 'Cerrado', sky: ['#8fc8ee', '#acd6f0', '#cfe5ef'], cel: ['sun', 0.82, 9, '#fff7d0'], hills: [['#b39a62', 0.5, 26], ['#8c8a45', 0.8, 33]], props: 'cerrado', grass: '#9a983c', soil: ['#8a3f22', '#7a361d', '#6a2e18', '#552413'] },
  { id: 'dunas', cat: 'Deserto', name: 'Dunas', sky: ['#ffe1ad', '#ffc985', '#f6ad66'], cel: ['sun', 0.5, 12, '#fff0c0'], hills: [['#e5b571', 0.5, 24], ['#d39a52', 0.9, 32]], props: 'cactos', grass: '#d9a85c', soil: ['#c98d4a', '#b67a3c', '#a06a33', '#87572a'] },
  { id: 'canion', cat: 'Deserto', name: 'Cânion vermelho', sky: ['#ffd0a1', '#f7b27e', '#e8946b'], cel: ['sun', 0.3, 11, '#fff1cf'], hills: [['#b65a3c', 0.3, 16], ['#9b4630', 0.6, 27]], props: 'mesas', grass: '#b8743f', soil: ['#a8532f', '#934528', '#7c3a22', '#64301c'] },
  { id: 'estrelada', cat: 'Noite', name: 'Noite estrelada', sky: ['#0b1130', '#121a42', '#1a2556', '#24326a'], cel: ['moon', 0.8, 10, '#f1eccf'], hills: [['#1d2848', 0.6, 24], ['#141e33', 1, 31]], props: 'estrelas', grass: '#1f3d2c', soil: ['#3a2a20', '#30231b', '#271c16', '#1e1511'] },
  { id: 'aurora', cat: 'Noite', name: 'Aurora', sky: ['#071a26', '#0b2633', '#103240', '#173f4c'], cel: ['moon', 0.15, 8, '#e6f2ef'], hills: [['#123040', 0.5, 26], ['#0b2230', 0.9, 32]], props: 'aurora', grass: '#1b4a3a', soil: ['#2f2a26', '#27231f', '#201c19', '#181513'] },
  { id: 'quintal', cat: 'Urbano', name: 'Quintal de casa', sky: ['#bde0f5', '#a5d3ef', '#8fc5e8'], cel: ['sun', 0.86, 9, '#fffbe6'], hills: [['#9fb7c9', 0.4, 24]], props: 'cerca', grass: '#4c9a3a', soil: ['#5c3d26', '#4f341f', '#432b1a', '#352214'] },
  { id: 'cidade', cat: 'Urbano', name: 'Cidade à noite', sky: ['#1b1433', '#2a1d45', '#3b2552', '#4f2f5a'], cel: ['moon', 0.12, 9, '#f4e6c8'], hills: [], props: 'predios', grass: '#2e4a2a', soil: ['#3b2c22', '#32261d', '#291f18', '#201812'] },
  { id: 'cogumelos', cat: 'Fantasia', name: 'Bosque de cogumelos', sky: ['#d9c7f0', '#c3aee8', '#a993dc'], cel: ['sun', 0.7, 10, '#fff2fb'], hills: [['#8a7cc0', 0.6, 22], ['#5f8f6a', 1, 30]], props: 'cogumelos', grass: '#4f9a62', soil: ['#4a3328', '#3f2b22', '#34241c', '#291c16'] },
  { id: 'doce', cat: 'Fantasia', name: 'Terra dos doces', sky: ['#ffe3f1', '#ffd0e6', '#ffbcd9'], cel: ['sun', 0.25, 11, '#fffbe8'], hills: [['#f4a3c4', 0.6, 22], ['#e985b0', 0.9, 30]], props: 'doces', grass: '#8fd6b0', soil: ['#7a4a3a', '#6a3f31', '#5a3529', '#4a2b21'] },
];
export const CATS = ['Todos', ...new Set(BGS.map((b) => b.cat))];
