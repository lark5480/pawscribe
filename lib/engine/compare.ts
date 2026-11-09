import type { Species, Vector } from './types';

export interface CompareConflict {
  dim: string;
  aLevel: number;
  bLevel: number;
}

export interface CompareResult {
  distance: number;
  cooperation: number;
  conflicts: CompareConflict[];
}

export interface CompareSpeciesDecision {
  ok: boolean;
  species: Species;
  speciesA: Species;
  speciesB: Species;
  reason?: 'cross-species';
}

function normalizeSpecies(value: string | null | undefined): Species {
  return value === 'dog' ? 'dog' : 'cat';
}

// 双宠对照的物种裁决：默认同物种（猫）；两侧物种不同时明确拒绝，不计算合作度
export function resolveCompareSpecies(input: {
  species?: string | null;
  speciesA?: string | null;
  speciesB?: string | null;
}): CompareSpeciesDecision {
  const species = normalizeSpecies(input.species);
  const speciesA = input.speciesA == null ? species : normalizeSpecies(input.speciesA);
  const speciesB = input.speciesB == null ? species : normalizeSpecies(input.speciesB);
  if (speciesA !== speciesB) {
    return { ok: false, species, speciesA, speciesB, reason: 'cross-species' };
  }
  return { ok: true, species: speciesA, speciesA, speciesB };
}

// 只接受 15 维、取值 0/1/2 的向量；压力分不在输入内
function assertVector(vector: Vector, label: string): void {
  if (!Array.isArray(vector) || vector.length !== 15) {
    throw new Error(label + ' 非法：应为 15 维向量');
  }
  for (const v of vector) {
    if (!Number.isInteger(v) || v < 0 || v > 2) {
      throw new Error(label + ' 非法：每一维只能是 0/1/2');
    }
  }
}

// 双方同一维都为 H 时记为同档；是否为需要留意的张力，由内容层的建议覆盖范围决定
export function compareVectors(a: Vector, b: Vector): CompareResult {
  assertVector(a, 'a');
  assertVector(b, 'b');
  let distance = 0;
  const conflicts: CompareConflict[] = [];
  for (let i = 0; i < 15; i++) {
    distance += Math.abs(a[i] - b[i]);
    if (a[i] === 2 && b[i] === 2) {
      conflicts.push({ dim: 'D' + (i + 1), aLevel: a[i], bLevel: b[i] });
    }
  }
  return {
    distance,
    cooperation: Math.round((1 - distance / 30) * 100),
    conflicts,
  };
}

// 「同处 H 档」不等于冲突：有建议覆盖的维度记为张力，其余双高维度是相处同频
export function splitShared(
  shared: CompareConflict[],
  adviceDims: string[],
): { tension: CompareConflict[]; resonance: CompareConflict[] } {
  const set = new Set(adviceDims);
  return {
    tension: shared.filter((c) => set.has(c.dim)),
    resonance: shared.filter((c) => !set.has(c.dim)),
  };
}
