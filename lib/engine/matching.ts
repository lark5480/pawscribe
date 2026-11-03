import type { Vector, TypeTemplate, MatchResult, TypeCopy, Species } from './types';

// 曼哈顿距离
export function manhattan(a: Vector, b: Vector): number {
  let d = 0;
  for (let i = 0; i < 15; i++) d += Math.abs(a[i] - b[i]);
  return d;
}

// 隐藏型行为规则按物种参数化（§17.3 / §17.4）：维度下标 0-based
export const HIDDEN_DIMENSIONS: Record<Species, number[]> = {
  cat: [3, 4, 5], // D4 日常活动量 / D5 新奇探索欲 / D6 专注持久度
  dog: [3, 5, 13], // D4 日常活动量 / D6 专注持久度 / D14 挫折耐受
};

// 匹配类型：最小距离者胜
export function matchType(
  vector: Vector,
  templates: TypeTemplate[],
  copies: TypeCopy[],
  species: Species = 'cat',
): MatchResult {
  let best = -1;
  let bestDist = Infinity;
  let bestExact = -1;
  for (let i = 0; i < templates.length; i++) {
    const d = manhattan(vector, templates[i].vector);
    const exact = templates[i].vector.filter((v, j) => v === vector[j]).length;
    if (d < bestDist || (d === bestDist && exact > bestExact)) {
      bestDist = d;
      best = i;
      bestExact = exact;
    }
  }
  const similarity = Math.max(0, Math.round((1 - bestDist / 30) * 100));
  // 精确命中 16 型模板时以模板为准；隐藏型只在未精确命中（距离 ≥ 1）时触发
  const hidden = bestDist >= 1 && isHiddenType(vector, species);
  const copy = copies[best];
  // 相似度是整数：距离 12 → 60%，距离 13 → 57%。阈值 60 对应 d≥13；
  // 若放宽到 <61，会把 d=12 一并兜底（45 题量表下约 5.5%），故保持 60。
  const isFallback = !hidden && similarity < 60;
  return {
    typeIndex: best,
    code: copy.code,
    name: copy.name,
    similarity,
    vector,
    isFallback,
    isHidden: hidden,
  };
}

// 隐藏型行为规则：猫 D4/D5/D6 全 H；狗 D4/D6/D14 全 H；最终判定还需未精确命中任一 16 型模板
export function isHiddenType(vector: Vector, species: Species = 'cat'): boolean {
  return HIDDEN_DIMENSIONS[species].every((i) => vector[i] === 2);
}
