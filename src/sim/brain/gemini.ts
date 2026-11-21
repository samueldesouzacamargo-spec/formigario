// Cérebro coletivo via Gemini. Define a política (pesos + pensamento); o comportamento local executa.
// Nada vindo do modelo é executado: só números limitados e texto cortado.
import { totalFood, active, type World, type Weights } from '../world';
import { antCap } from '../../data/levels';
import { roleCounts, roleProgress } from '../roles';

export interface BrainOut { w: Weights; foco: string; thought: string; evento: string | null }
/** Interface pronta pra trocar a chamada direta por um proxy (ex.: Cloudflare Worker) que guarda a chave. */
export interface BrainProvider { name: string; think(snapshot: object): Promise<BrainOut> }

export function snapshot(w: World) {
  const S = w.S;
  return {
    especie: w.sp.name, nivel: w.level, operarias: w.ants.length, teto: antCap(w.level), ovos: S.eggs,
    comida_total: totalFood(w),
    camaras: w.rooms.filter((r) => r.ph <= w.level).map((r) => ({ tipo: r.type, aberta: active(r), cavado_pct: Math.round((r.dugN / r.cells.length) * 100), itens: r.items.length + r.fung })),
    petiscos_superficie: w.treats.map((t) => ({ tipo: t.type, pedacos: t.n })),
    funcoes: roleCounts(w),
    progresso_funcoes_pct: roleProgress(w),
    lixo: Math.floor(S.trash),
    chovendo: w.rain > 0,
    seg_desde_ultimo_petisco: S.lastTreat ? Math.round((Date.now() - S.lastTreat) / 1000) : null,
    celulas_por_cavar: w.wantLeft,
    ultimos_eventos: S.logs.slice(0, 5).map((l) => l[1]),
  };
}

const PRIO = ['cavar', 'forragear', 'cuidar_crias', 'jardinar', 'limpar'] as const;
const FOCOS = ['proxima_camara', 'alargar_tuneis', 'explorar'];
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    prioridades: { type: 'OBJECT', properties: Object.fromEntries(PRIO.map((k) => [k, { type: 'NUMBER' }])), required: [...PRIO] },
    foco_escavacao: { type: 'STRING', enum: FOCOS },
    pensamento: { type: 'STRING' },
    evento: { type: 'STRING', nullable: true },
  },
  required: ['prioridades', 'foco_escavacao', 'pensamento'],
};
const SYSTEM = `Você é o cérebro coletivo de uma colônia de formigas num formigário digital.
Recebe o estado da colônia em JSON e devolve a política: pesos de 0 a 3 para cada tarefa (a colônia divide as operárias entre as funções nessa proporção, aos poucos), o foco da escavação
e um pensamento curto (até 140 caracteres, pt-BR, voz de colônia de formigas, sem emojis).
Reaja à situação: chuva → quase ninguém forrageia; petisco na superfície → forragear alto; câmara em obra → cavar; ovos → cuidar_crias; lixo → limpar.
"evento" é opcional: uma frase curta pro diário quando algo notável acontecer, senão null.`;

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.min(3, Math.max(0, n)) : 0.5; };
const text = (v: unknown, max = 140) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** valida e limita a resposta do modelo */
export function sanitize(raw: unknown): BrainOut {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const p = (o.prioridades && typeof o.prioridades === 'object' ? o.prioridades : {}) as Record<string, unknown>;
  return {
    w: { dig: num(p.cavar), forage: num(p.forragear), nurse: num(p.cuidar_crias), garden: num(p.jardinar), haul: num(p.limpar) },
    foco: FOCOS.includes(o.foco_escavacao) ? o.foco_escavacao : 'proxima_camara',
    thought: text(o.pensamento) || 'Antenas em silêncio.',
    evento: text(o.evento) || null,
  };
}

export function geminiProvider(key: string, model: string): BrainProvider {
  return {
    name: 'Gemini',
    async think(snap) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(snap) }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.9, maxOutputTokens: 300 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 404) throw new Error(`modelo "${model}" não existe; troque em Opções`);
      if (res.status === 400 || res.status === 403) throw new Error('chave recusada; confira em Opções');
      if (!res.ok) throw new Error(`erro ${res.status}`);
      const data = await res.json();
      return sanitize(JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'));
    },
  };
}

/** Aplica a resposta no mundo; segura o cérebro local por ~2,5 min. */
export function applyBrain(w: World, out: BrainOut) {
  Object.assign(w.brain.w, out.w);
  w.brain.thought = out.thought; w.brain.foco = out.foco; w.brain.source = 'gemini'; w.brain.lock = 150;
}

/** no máximo `max` chamadas por hora */
export function rateLimiter(max = 30) {
  const calls: number[] = [];
  return (now = Date.now()) => {
    while (calls.length && now - calls[0] > 3600_000) calls.shift();
    if (calls.length >= max) return false;
    calls.push(now);
    return true;
  };
}
