// Passo fixo de 30 Hz × velocidade. A velocidade nunca multiplica o tempo de foco.
export const STEP = 1 / 30;

export function makeClock(step: (d: number) => void) {
  let acc = 0;
  /** dt = segundos reais desde o último quadro; devolve o foco a somar */
  return (dt: number, speed: number) => {
    dt = Math.max(0, Math.min(0.25, dt)); // abas travadas não viram um pulo gigante; o catch-up cuida do resto
    acc += dt * speed;
    while (acc >= STEP) { acc -= STEP; step(STEP); }
    return dt;
  };
}

/** 0 = dia claro, ~0.6 = madrugada. Curva suave pelo horário local. */
export function darkness(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const sun = Math.cos(((h - 13) / 24) * 2 * Math.PI); // 1 às 13h, -1 à 1h
  return Math.min(1, Math.max(0, (0.35 - sun) / 0.7)) * 0.62;
}

/** posição do sol e da lua no céu (0–1 ao longo do arco), ou null quando abaixo do horizonte */
export function skyArc(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const su = (h - 5.5) / 14, mu = (((h - 18.5) % 24) + 24) % 24 / 12;
  return { sun: su >= 0 && su <= 1 ? su : null, moon: mu <= 1 ? mu : null };
}
