import type { Vector } from './types';

const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 15 维向量 → base36 字符串
// 编码：vector[0] 为最低位，vector[14] 为最高位
export function encodeVector(vector: Vector): string {
  let num = BigInt(0);
  for (let i = 14; i >= 0; i--) {
    num = num * BigInt(3) + BigInt(vector[i]);
  }
  if (num === BigInt(0)) return '0';
  let out = '';
  while (num > BigInt(0)) {
    out = BASE36[Number(num % BigInt(36))] + out;
    num = num / BigInt(36);
  }
  return out;
}

// base36 字符串 → 15 维向量
// 解码：先取出最低位 vector[0]，依次 push
export function decodeVector(code: string): Vector | null {
  let num = BigInt(0);
  for (const ch of code.toUpperCase()) {
    const idx = BASE36.indexOf(ch);
    if (idx === -1) return null;
    num = num * BigInt(36) + BigInt(idx);
  }
  const vector: Vector = [];
  for (let i = 0; i < 15; i++) {
    vector.push(Number(num % BigInt(3)) as 0 | 1 | 2);
    num = num / BigInt(3);
  }
  if (num !== BigInt(0)) return null;
  return vector;
}
