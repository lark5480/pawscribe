import type { Vector, TypeTemplate, MatchResult, TypeCopy, Species, Level } from './types';

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

// 相似度 60% 对应距离 12；距离 ≥13 触发兜底（§6.3）
const FALLBACK_DISTANCE = 13;
const DIMENSION_COUNT = 15;

export interface RunnerUpInfo {
  typeIndex: number;
  code: string;
  name: string;
  distance: number;
}

export interface FlipHint {
  dim: string;
  from: Level;
  to: Level;
  typeIndex: number;
  typeCode: string;
  typeName: string;
  distance: number;
  triggersHidden: boolean;
  triggersFallback: boolean;
}

export interface MatchExplanation {
  // 距离最近的模板，隐藏型/兜底型下与 matchType 的 typeIndex 一致
  nearest: RunnerUpInfo;
  runnerUp: RunnerUpInfo | null;
  // 15 维里与模板完全一致的维数
  exactCount: number;
  // 相对亚军、支持了本次判定的维度
  decisiveDims: string[];
  // 离 60% 兜底线还剩多少距离；已兜底时为 0
  fallbackGap: number;
  // 只改一维就会改变结果的最小改动；兜底/隐藏型不预测
  flip: FlipHint | null;
}

function dimId(index: number): string {
  return 'D' + (index + 1);
}

// 解释一次匹配：为什么是这型、差亚军多少、改哪一维会变成别型
export function explainMatch(
  vector: Vector,
  templates: TypeTemplate[],
  copies: TypeCopy[],
  species: Species = 'cat',
): MatchExplanation {
  const ranked = templates
    .map((template, index) => {
      let exact = 0;
      for (let i = 0; i < DIMENSION_COUNT; i++) {
        if (template.vector[i] === vector[i]) exact++;
      }
      return { index, distance: manhattan(vector, template.vector), exact };
    })
    .sort((a, b) => a.distance - b.distance || b.exact - a.exact);

  const best = ranked[0];
  const second = ranked[1];
  const nearest: RunnerUpInfo = {
    typeIndex: best.index,
    code: copies[best.index].code,
    name: copies[best.index].name,
    distance: best.distance,
  };
  const runnerUp: RunnerUpInfo | null = second
    ? {
        typeIndex: second.index,
        code: copies[second.index].code,
        name: copies[second.index].name,
        distance: second.distance,
      }
    : null;

  const decisiveDims: string[] = [];
  if (second) {
    for (let i = 0; i < DIMENSION_COUNT; i++) {
      const toBest = Math.abs(vector[i] - templates[best.index].vector[i]);
      const toSecond = Math.abs(vector[i] - templates[second.index].vector[i]);
      if (toBest < toSecond) decisiveDims.push(dimId(i));
    }
  }

  const current = matchType(vector, templates, copies, species);
  let flip: FlipHint | null = null;
  if (!current.isFallback && !current.isHidden) {
    for (let i = 0; i < DIMENSION_COUNT; i++) {
      for (const to of [0, 1, 2] as Level[]) {
        if (to === vector[i]) continue;
        const candidate = vector.slice() as Vector;
        candidate[i] = to;
        const result = matchType(candidate, templates, copies, species);
        const changed = result.isHidden || result.isFallback || result.typeIndex !== current.typeIndex;
        if (!changed) continue;
        const hint: FlipHint = {
          dim: dimId(i),
          from: vector[i] as Level,
          to,
          typeIndex: result.typeIndex,
          typeCode: result.code,
          typeName: result.name,
          distance: manhattan(candidate, templates[result.typeIndex].vector),
          triggersHidden: result.isHidden,
          triggersFallback: result.isFallback && !result.isHidden,
        };
        const hintDelta = Math.abs(to - vector[i]);
        const flipDelta = flip ? Math.abs(flip.to - flip.from) : Infinity;
        if (
          !flip ||
          hint.distance < flip.distance ||
          (hint.distance === flip.distance &&
            (hintDelta < flipDelta ||
              (hintDelta === flipDelta && i < Number(flip.dim.slice(1)) - 1)))
        ) {
          flip = hint;
        }
      }
    }
  }

  return {
    nearest,
    runnerUp,
    exactCount: best.exact,
    decisiveDims,
    fallbackGap: current.isFallback ? 0 : Math.max(0, FALLBACK_DISTANCE - best.distance),
    flip,
  };
}
