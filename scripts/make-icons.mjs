// Gera os ícones PNG do PWA sem dependências: um formigário 16×16 em pixel art, ampliado.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const P = { w: [62, 39, 22], s: [244, 177, 131], g: [95, 143, 58], t: [107, 68, 41], d: [30, 19, 12], a: [163, 67, 29], h: [110, 42, 16] };
const art = [
  'wwwwwwwwwwwwwwww',
  'wssssssssssssssw',
  'wssssssssssssssw',
  'wssssssssssssssw',
  'wggggggddggggggw',
  'wttttttddttttttw',
  'wttttttddttttttw',
  'wttttddddddttttw',
  'wtttddddddddtttw',
  'wtttdahaahdddttw',
  'wtttdddhdhddtttw',
  'wttttddddddttttw',
  'wttttttddttttttw',
  'wtttttdddddddttw',
  'wttttttttttttttw',
  'wwwwwwwwwwwwwwww',
];
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

function png(size) {
  const k = size / 16, raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) raw.set(P[art[(y / k) | 0][(x / k) | 0]], y * (size * 3 + 1) + 1 + x * 3);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [192, 512]) writeFileSync(new URL(`../public/icon-${s}.png`, import.meta.url), png(s));
console.log('ícones gerados');
