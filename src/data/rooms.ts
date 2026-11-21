export type RoomType = 'rainha' | 'crias' | 'fungo' | 'comida' | 'lixo' | 'mel';
/** [rótulo, cor da planta] */
export const ROOMS: Record<RoomType, [string, string]> = {
  rainha: ['Câmara real', '#ffd166'],
  crias: ['Berçário', '#f4a6c1'],
  fungo: ['Jardim de fungo', '#ece6d2'],
  comida: ['Despensa', '#8bd17c'],
  lixo: ['Lixeira', '#a39686'],
  mel: ['Adega de mel', '#ffb347'],
};
