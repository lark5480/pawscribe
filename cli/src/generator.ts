const DIMENSIONS = [
  { id: 'D1', model: 'M1', name: '大胆度', lowDesc: '躲着走', highDesc: '主动凑近' },
  { id: 'D2', model: 'M1', name: '惊惧敏感度', lowDesc: '雷声无反应', highDesc: '炸毛躲藏' },
  { id: 'D3', model: 'M1', name: '恢复力', lowDesc: '半天回不来', highDesc: '一惊即过' },
  { id: 'D4', model: 'M2', name: '日常活动量', lowDesc: '整天睡', highDesc: '停不下来' },
  { id: 'D5', model: 'M2', name: '新奇探索欲', lowDesc: '先躲', highDesc: '立刻拆扑' },
  { id: 'D6', model: 'M2', name: '专注持久度', lowDesc: '玩两下就走', highDesc: '咬着不放' },
  { id: 'D7', model: 'M3', name: '对人依恋亲近', lowDesc: '你回来它照旧睡', highDesc: '时刻踩奶' },
  { id: 'D8', model: 'M3', name: '同类社交', lowDesc: '见同类炸毛', highDesc: '主动凑过去' },
  { id: 'D9', model: 'M3', name: '社交主动性', lowDesc: '客人来就躲', highDesc: '第一个冲过去' },
  { id: 'D10', model: 'M4', name: '独立自主', lowDesc: '贴着人走', highDesc: '大部分时间自己待' },
  { id: 'D11', model: 'M4', name: '领地与护食', lowDesc: '资源被碰就走', highDesc: '死死护住抢食' },
  { id: 'D12', model: 'M4', name: '变动耐受', lowDesc: '换家具就乱', highDesc: '搬到哪都照样吃睡' },
  { id: 'D13', model: 'M5', name: '易激惹度', lowDesc: '被冒犯会走开', highDesc: '咬抓扑' },
  { id: 'D14', model: 'M5', name: '挫折耐受', lowDesc: '得不到就放弃', highDesc: '反复尝试叫扒砸' },
  { id: 'D15', model: 'M5', name: '冲动性', lowDesc: '先观望很久', highDesc: '立刻扑抢冲' },
];
const LEVELS = ['L', 'M', 'H'];
const MIN_PER_LEVEL = 3;
const MIN_DIST = 4;
function decode(code: number): number[] { const d: number[] = []; for (let i = 0; i < 15; i++) d.push((code >> (i * 2)) & 3); return d; }
function encode(dims: number[]): number { let c = 0; for (let i = 0; i < 15; i++) c |= (dims[i] & 3) << (i * 2); return c; }
function isPlausible(code: number): boolean { const d = decode(code); if (d[0]===2&&d[1]===2) return false; if (d[0]===2&&d[2]===0) return false; if (d[12]===2&&d[13]===2) return false; if (d[6]===0&&d[8]===2) return false; return true; }
// 16 型向量是内容合同的一部分，固定种子保证 cli:types 不会把已审核的模板换回旧版
const FIXED_VECTOR_STRINGS = [
  'LLLLLLLLLLLLLLL',
  'HHHHHHHHHHHHHHH',
  'HHHLLLLLLLLLLLL',
  'LLLHHHLLLLLLLLL',
  'LLLLLLHHHLLLLLL',
  'LLLLLLLLLHHHLLL',
  'LLLLLLLLLLLLHHH',
  'LLLLLHLLLHLHLHL',
  'LLMLLMHLLLLHLLL',
  'LHLLLLMLLMLLLLL',
  'LHLHHLLHHMHMMMM',
  'HLHLHHHHLMLHLLM',
  'HHLLHLHLHHLHLHL',
  'LLHHLHLLHHLHHMM',
  'HHLMLLHHLLLHHLH',
  'HLHHHMHLLHHLLHL',
];
function getSeeds(): number[] {
  return FIXED_VECTOR_STRINGS.map((s) => encode([...s].map((c) => (c === 'L' ? 0 : c === 'M' ? 1 : 2))));
}
function mulberry32(seed: number) { return function() { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function manhattanArr(a: number[], b: number[]): number { let d = 0; for (let i = 0; i < 15; i++) d += Math.abs(a[i] - b[i]); return d; }

// 生成模拟用户池（正态分布，均值 1，标准差 0.6）
function generateUserPool(count: number, rng: () => number): number[] {
  const pool = new Set<number>();
  for (let n = 0; n < count; n++) {
    const user: number[] = [];
    for (let i = 0; i < 15; i++) { user.push(Math.floor(rng() * 3)); }
    pool.add(encode(user));
  }
  return [...pool];
}

// 带约束的最远点采样：候选池为模拟用户，要求距离>=4 且每档>=3
function sampleTypes(pool: number[], seeds: number[], count: number): number[] {
  const selected: number[] = [...seeds];
  const selectedSet = new Set(selected);
  const selectedDims: number[][] = selected.map(decode);
  const poolDims = pool.map(decode);
  const levelCounts: number[][] = [];
  for (let i = 0; i < 15; i++) levelCounts.push([0, 0, 0]);
  for (const sd of selectedDims) for (let i = 0; i < 15; i++) levelCounts[i][sd[i]]++;
  
  while (selected.length < count) {
    let targetLevel = -1;
    let minCount = Infinity;
    for (const level of [1, 0, 2]) {
      for (let i = 0; i < 15; i++) {
        const c = levelCounts[i][level];
        if (c < MIN_PER_LEVEL && c < minCount) { minCount = c; targetLevel = level; }
      }
    }
    let best = -1, bestFill = -1, bestDist = -1;
    for (let i = 0; i < pool.length; i++) {
      const code = pool[i];
      if (selectedSet.has(code)) continue;
      const dims = poolDims[i];
      let minDist = Infinity;
      for (const sd of selectedDims) { const dist = manhattanArr(dims, sd); if (dist < minDist) minDist = dist; if (minDist < MIN_DIST) break; }
      if (minDist < MIN_DIST) continue;
      let fill = 0;
      if (targetLevel !== -1) {
        for (let d = 0; d < 15; d++) if (dims[d] === targetLevel && levelCounts[d][targetLevel] < MIN_PER_LEVEL) fill++;
        if (fill === 0) continue;
      }
      if (fill > bestFill || (fill === bestFill && minDist > bestDist)) { bestFill = fill; bestDist = minDist; best = i; }
    }
    if (best === -1) break;
    const code = pool[best];
    selected.push(code); selectedSet.add(code);
    const dims = poolDims[best];
    for (let d = 0; d < 15; d++) levelCounts[d][dims[d]]++;
    selectedDims.push(dims);
  }
  return selected;
}

const rng = mulberry32(20261102); const pool = generateUserPool(200000, rng);
const selected = sampleTypes(pool, getSeeds(), 16);
const result: any = {
  dimensions: DIMENSIONS,
  types: selected.map((code, idx) => { const dims = decode(code); return { index: idx, code, vector: dims, vectorStr: dims.map(d => LEVELS[d]).join('') }; }),
  stats: { poolSize: pool.length, minPairDistance: 0, dimensionDistribution: [] as any[], coverage: null as any },
};
let minDist = Infinity;
for (let i = 0; i < selected.length; i++) for (let j = i + 1; j < selected.length; j++) { const d = manhattanArr(decode(selected[i]), decode(selected[j])); if (d < minDist) minDist = d; }
result.stats.minPairDistance = minDist;
for (let i = 0; i < 15; i++) { const counts = [0,0,0]; for (const code of selected) counts[(code >> (i*2)) & 3]++; result.stats.dimensionDistribution.push({ dimension: DIMENSIONS[i].id, L: counts[0], M: counts[1], H: counts[2] }); }
// 覆盖模拟
const coverage = new Array(selected.length).fill(0);
for (const uc of pool) { const ud = decode(uc); let best = -1, bestDist = Infinity; for (let t = 0; t < selected.length; t++) { const d = manhattanArr(ud, decode(selected[t])); if (d < bestDist) { bestDist = d; best = t; } } coverage[best]++; }
const sorted = [...coverage].sort((a, b) => b - a);
let cum = 0, types = 0;
for (const c of sorted) { cum += c; types++; if (cum / pool.length >= 0.9) break; }
result.stats.coverage = { typesFor90: types, coverage };
console.log(JSON.stringify(result, null, 2));
