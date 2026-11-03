import type { Question, SpecialTypeCopy, StressQuestion, TypeCopy } from './types';

// 程度副词按词级判定：只拦真实的程度断言，放行「最近」「第一次」等时间用法
const BANNED_PATTERNS: Array<{ word: string; test: RegExp }> = [
  { word: '最', test: /最(?!(近|初|后|终))/ },
  { word: '第一', test: /第一(?!次)/ },
  { word: '绝对', test: /绝对/ },
  { word: '一定', test: /一定/ },
  { word: '治愈', test: /治愈/ },
];
const DIAGNOSIS_WORDS = ['诊断', '异常', '障碍', '病症'];

// 狗册内容不得出现猫册专属场景词；「猫」一字覆盖猫薄荷、猫爬架等复合词
export const CAT_SPECIFIC_WORDS = [
  '猫',
  '踩奶',
  '纸箱',
  '炸毛',
  '猫砂',
  '猫抓板',
  '猫爬架',
  '猫包',
  '逗猫棒',
  '哈气',
];

export interface DimensionAnchor {
  id: string;
  lowDesc: string;
  highDesc: string;
}

function checkBanned(text: string, label: string, errors: string[]): void {
  for (const { word, test } of BANNED_PATTERNS) {
    if (test.test(text)) errors.push(label + '含禁用词「' + word + '」');
  }
}

function checkDiagnosis(text: string, label: string, errors: string[]): void {
  for (const w of DIAGNOSIS_WORDS) {
    if (text.includes(w)) errors.push(label + '含诊断词「' + w + '」');
  }
}

function checkForbidden(text: string, label: string, forbiddenWords: string[], errors: string[]): void {
  for (const w of forbiddenWords) {
    if (text.includes(w)) errors.push(label + '含物种专属词「' + w + '」');
  }
}

export function validateQuiz(questions: Question[], forbiddenWords: string[] = []): string[] {
  const errors: string[] = [];
  if (questions.length !== 30) errors.push('题量应为 30，实际 ' + questions.length);
  const dimCount: Record<string, number> = {};
  const dimReverse: Record<string, number> = {};
  for (const q of questions) {
    dimCount[q.dim] = (dimCount[q.dim] || 0) + 1;
    if (q.reverse) dimReverse[q.dim] = (dimReverse[q.dim] || 0) + 1;
    if (q.options.length !== 3) errors.push('第 ' + q.id + ' 题选项数应为 3');
    checkBanned(q.q, '第 ' + q.id + ' 题题干', errors);
    checkDiagnosis(q.q, '第 ' + q.id + ' 题题干', errors);
    checkForbidden(q.q, '第 ' + q.id + ' 题题干', forbiddenWords, errors);
    for (const o of q.options) {
      checkBanned(o, '第 ' + q.id + ' 题选项', errors);
      checkDiagnosis(o, '第 ' + q.id + ' 题选项', errors);
      checkForbidden(o, '第 ' + q.id + ' 题选项', forbiddenWords, errors);
    }
  }
  for (let i = 1; i <= 15; i++) {
    const d = 'D' + i;
    if (dimCount[d] !== 2) errors.push(d + ' 题量应为 2，实际 ' + (dimCount[d] || 0));
    if ((dimReverse[d] || 0) > 1) errors.push(d + ' 反向题应 ≤1，实际 ' + dimReverse[d]);
  }
  const totalReverse = questions.filter(q => q.reverse).length;
  if (totalReverse !== 5) errors.push('反向题应为 5，实际 ' + totalReverse);
  // D8 单宠兜底由题目元数据标记，不再用题干关键词猜测
  const d8 = questions.filter(q => q.dim === 'D8');
  const hasFallback = d8.some(q => q.singlePet === true);
  if (!hasFallback) errors.push('D8 缺少单宠兜底场景（未标记 singlePet）');
  return errors;
}

export function validateAnchors(anchors: DimensionAnchor[]): string[] {
  const errors: string[] = [];
  if (anchors.length !== 15) errors.push('锚点维度数应为 15，实际 ' + anchors.length);
  const ids = new Set<string>();
  let anchorCount = 0;
  for (const item of anchors) {
    if (ids.has(item.id)) errors.push(item.id + ' 锚点重复');
    ids.add(item.id);
  }
  for (let i = 1; i <= 15; i++) {
    const id = 'D' + i;
    const item = anchors.find((a) => a.id === id);
    if (!item) {
      errors.push(id + ' 缺少锚点');
      continue;
    }
    if (!item.lowDesc) errors.push(id + ' 缺少 L 端锚点');
    else anchorCount++;
    if (!item.highDesc) errors.push(id + ' 缺少 H 端锚点');
    else anchorCount++;
    for (const [level, text] of [
      ['L', item.lowDesc],
      ['H', item.highDesc],
    ] as const) {
      if (!text) continue;
      checkBanned(text, id + ' ' + level + ' 端锚点', errors);
      checkDiagnosis(text, id + ' ' + level + ' 端锚点', errors);
      checkForbidden(text, id + ' ' + level + ' 端锚点', CAT_SPECIFIC_WORDS, errors);
    }
  }
  if (anchorCount !== 30) errors.push('锚点应为 30 条（15 维 × L/H），实际 ' + anchorCount);
  return errors;
}

export function validateCopy(
  copies: TypeCopy[],
  reservedCodes: string[] = [],
  forbiddenWords: string[] = [],
): string[] {
  const errors: string[] = [];
  if (copies.length !== 16) errors.push('类型数应为 16，实际 ' + copies.length);
  const codes = new Set<string>();
  const reserved = new Set(reservedCodes);
  for (const c of copies) {
    if (!/^[A-Z]{4}$/.test(c.code)) errors.push('代码 ' + c.code + ' 应为 4 位大写字母');
    if (codes.has(c.code)) errors.push('代码 ' + c.code + ' 重复');
    if (reserved.has(c.code)) errors.push('代码 ' + c.code + ' 与另一册冲突（建议全局唯一）');
    codes.add(c.code);
    if (!c.name || c.name.length < 2) errors.push('第 ' + c.index + ' 型中文名缺失');
    if (!c.hook) errors.push('第 ' + c.index + ' 型钩子缺失');
    if (!c.breed) errors.push('第 ' + c.index + ' 型品种参考缺失');
    if (c.tips.length !== 3) errors.push('第 ' + c.index + ' 型相处建议应为 3 条，实际 ' + c.tips.length);
    checkBanned(c.name, '第 ' + c.index + ' 型中文名', errors);
    checkBanned(c.hook, '第 ' + c.index + ' 型钩子', errors);
    if (c.breed) checkBanned(c.breed, '第 ' + c.index + ' 型品种参考', errors);
    checkDiagnosis(c.name, '第 ' + c.index + ' 型中文名', errors);
    checkDiagnosis(c.hook, '第 ' + c.index + ' 型钩子', errors);
    if (c.breed) checkDiagnosis(c.breed, '第 ' + c.index + ' 型品种参考', errors);
    checkForbidden(c.name, '第 ' + c.index + ' 型中文名', forbiddenWords, errors);
    checkForbidden(c.hook, '第 ' + c.index + ' 型钩子', forbiddenWords, errors);
    if (c.breed) checkForbidden(c.breed, '第 ' + c.index + ' 型品种参考', forbiddenWords, errors);
    for (const t of c.tips) {
      checkBanned(t, '第 ' + c.index + ' 型建议', errors);
      checkDiagnosis(t, '第 ' + c.index + ' 型建议', errors);
      checkForbidden(t, '第 ' + c.index + ' 型建议', forbiddenWords, errors);
    }
  }
  return errors;
}

export function validateSpecial(
  special: { hidden: SpecialTypeCopy; fallback: SpecialTypeCopy },
  forbiddenWords: string[] = [],
): string[] {
  const errors: string[] = [];
  for (const kind of ['hidden', 'fallback'] as const) {
    const c = special[kind];
    if (!c.label) errors.push(kind + ' 缺少分档标签');
    if (!c.name) errors.push(kind + ' 缺少名称');
    if (c.tips.length !== 3) errors.push(kind + ' 相处建议应为 3 条，实际 ' + c.tips.length);
    checkBanned(c.name, kind + ' 名称', errors);
    checkBanned(c.note, kind + ' 说明', errors);
    if (c.hook) checkBanned(c.hook, kind + ' 钩子', errors);
    checkDiagnosis(c.name, kind + ' 名称', errors);
    checkDiagnosis(c.note, kind + ' 说明', errors);
    if (c.hook) checkDiagnosis(c.hook, kind + ' 钩子', errors);
    checkForbidden(c.name, kind + ' 名称', forbiddenWords, errors);
    checkForbidden(c.note, kind + ' 说明', forbiddenWords, errors);
    if (c.hook) checkForbidden(c.hook, kind + ' 钩子', forbiddenWords, errors);
    for (const t of c.tips) {
      checkBanned(t, kind + ' 建议', errors);
      checkDiagnosis(t, kind + ' 建议', errors);
      checkForbidden(t, kind + ' 建议', forbiddenWords, errors);
    }
  }
  return errors;
}

export function validateCompareAdvice(
  advice: Record<string, { suggestion: string }>,
  forbiddenWords: string[] = [],
): string[] {
  const errors: string[] = [];
  for (const [dim, item] of Object.entries(advice)) {
    if (!/^D(?:[1-9]|1[0-5])$/.test(dim)) errors.push('比较建议维度名非法：' + dim);
    if (!item.suggestion) errors.push(dim + ' 缺少建议正文');
    checkBanned(item.suggestion, dim + ' 建议', errors);
    checkDiagnosis(item.suggestion, dim + ' 建议', errors);
    checkForbidden(item.suggestion, dim + ' 建议', forbiddenWords, errors);
  }
  return errors;
}

const STRESS_SCORES = [0, 50, 100];

export interface StressValidationOptions {
  forbiddenWords?: string[];
  indicators?: Array<{ id: string; name: string; source: string }>;
}

export function validateStress(
  questions: StressQuestion[],
  levels: Array<{ level: string; label: string; text: string }>,
  quizIds: number[],
  options: StressValidationOptions = {},
): string[] {
  const errors: string[] = [];
  const { forbiddenWords = [], indicators } = options;
  if (questions.length !== 4) errors.push('压力题量应为 4，实际 ' + questions.length);
  if (levels.length !== 2) errors.push('压力分档应为 2，实际 ' + levels.length);
  const ids = new Set<number>();
  for (const q of questions) {
    if (ids.has(q.id)) errors.push('压力题 id ' + q.id + ' 重复');
    if (quizIds.includes(q.id)) errors.push('压力题 id ' + q.id + ' 与题库冲突');
    ids.add(q.id);
    if (q.options.length !== 3) errors.push('压力题 ' + q.id + ' 选项数应为 3');
    if (q.scores.join(',') !== STRESS_SCORES.join(',')) errors.push('压力题 ' + q.id + ' 分值应为 0/50/100');
    checkBanned(q.q, '压力题 ' + q.id + ' 题干', errors);
    checkDiagnosis(q.q, '压力题 ' + q.id + ' 题干', errors);
    checkForbidden(q.q, '压力题 ' + q.id + ' 题干', forbiddenWords, errors);
    for (const o of q.options) {
      checkBanned(o, '压力题 ' + q.id + ' 选项', errors);
      checkDiagnosis(o, '压力题 ' + q.id + ' 选项', errors);
      checkForbidden(o, '压力题 ' + q.id + ' 选项', forbiddenWords, errors);
    }
  }
  for (const l of levels) {
    checkBanned(l.label, '压力档位「' + l.level + '」标签', errors);
    checkBanned(l.text, '压力档位「' + l.level + '」文案', errors);
    checkDiagnosis(l.label, '压力档位「' + l.level + '」标签', errors);
    checkDiagnosis(l.text, '压力档位「' + l.level + '」文案', errors);
    checkForbidden(l.label, '压力档位「' + l.level + '」标签', forbiddenWords, errors);
    checkForbidden(l.text, '压力档位「' + l.level + '」文案', forbiddenWords, errors);
  }
  if (indicators) {
    if (indicators.length !== 2) errors.push('压力指标应为 2，实际 ' + indicators.length);
    const indicatorIds = new Set<string>();
    for (const indicator of indicators) {
      if (indicatorIds.has(indicator.id)) errors.push('压力指标 id ' + indicator.id + ' 重复');
      indicatorIds.add(indicator.id);
      if (!indicator.name) errors.push('压力指标 ' + indicator.id + ' 缺少名称');
      if (!indicator.source) errors.push('压力指标 ' + indicator.id + ' 缺少文献出处');
      const count = questions.filter((q) => q.indicator === indicator.id).length;
      if (count !== 2) errors.push('压力指标 ' + indicator.id + ' 应有 2 题，实际 ' + count);
      checkBanned(indicator.name, '压力指标 ' + indicator.id + ' 名称', errors);
      checkForbidden(indicator.name, '压力指标 ' + indicator.id + ' 名称', forbiddenWords, errors);
      checkForbidden(indicator.source, '压力指标 ' + indicator.id + ' 文献出处', forbiddenWords, errors);
    }
    for (const q of questions) {
      if (!indicatorIds.has(q.indicator)) errors.push('压力题 ' + q.id + ' 引用了未定义的指标 ' + q.indicator);
    }
  }
  return errors;
}
