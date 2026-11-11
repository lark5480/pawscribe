import { existsSync, readFileSync } from 'fs';
import {
  CAT_SPECIFIC_WORDS,
  validateQuiz,
  validateCopy,
  validateStress,
  validateSpecial,
  validateCompareAdvice,
  validateAnchors,
  validateDimensionSources,
} from '../../lib/engine/validator.ts';
import type { DimensionAnchor, DimensionSources } from '../../lib/engine/validator.ts';
import type { Question, SpecialTypeCopy, StressQuestion, TypeCopy } from '../../lib/engine/types.ts';

const base = new URL('../../content/', import.meta.url);
const quizData = JSON.parse(readFileSync(new URL('quiz-cat.json', base), 'utf8')) as Question[];
const copyData = JSON.parse(readFileSync(new URL('copy-cat.json', base), 'utf8')) as TypeCopy[];
const stressData = JSON.parse(readFileSync(new URL('stress-cat.json', base), 'utf8')) as {
  indicators: Array<{ id: string; name: string; source: string }>;
  questions: StressQuestion[];
  levels: Array<{ level: string; label: string; text: string }>;
};
const specialData = JSON.parse(readFileSync(new URL('special-cat.json', base), 'utf8')) as {
  hidden: SpecialTypeCopy;
  fallback: SpecialTypeCopy;
};
const adviceData = JSON.parse(readFileSync(new URL('compare-advice.json', base), 'utf8')) as Record<string, { suggestion: string }>;
const sourceData = JSON.parse(readFileSync(new URL('dimension-sources.json', base), 'utf8')) as DimensionSources;

function readOptional<T>(name: string): T | null {
  const url = new URL(name, base);
  return existsSync(url) ? (JSON.parse(readFileSync(url, 'utf8')) as T) : null;
}

// 「待补文献」是显式的诚实标注：只报告数量，不作为错误拦截
function pendingNote(data: DimensionSources): string {
  const n =
    data.dimensions.filter((d) => d.source.includes('待补文献')).length +
    data.references.filter((r) => r.detail.includes('待补文献')).length;
  return n === 0 ? '' : '；' + n + ' 处标注「待补文献」（显式标注，不拦截）';
}

const dogQuizData = readOptional<Question[]>('quiz-dog.json');
const dogAnchorsData = readOptional<{ dimensions: DimensionAnchor[] }>('dimensions-dog.json');
const dogCopyData = readOptional<TypeCopy[]>('copy-dog.json');
const dogSpecialData = readOptional<{ hidden: SpecialTypeCopy; fallback: SpecialTypeCopy }>('special-dog.json');
const dogStressData = readOptional<{
  indicators: Array<{ id: string; name: string; source: string }>;
  questions: StressQuestion[];
  levels: Array<{ level: string; label: string; text: string }>;
}>('stress-dog.json');
const dogAdviceData = readOptional<Record<string, { suggestion: string }>>('compare-advice-dog.json');
const dogSourceData = readOptional<DimensionSources>('dimension-sources-dog.json');

const quizErrors = validateQuiz(quizData);
const copyErrors = validateCopy(copyData);
const stressErrors = validateStress(stressData.questions, stressData.levels, quizData.map(q => q.id), {
  indicators: stressData.indicators,
});
const specialErrors = validateSpecial(specialData);
const adviceErrors = validateCompareAdvice(adviceData);
const sourceErrors = validateDimensionSources(sourceData);
const dogQuizErrors = dogQuizData ? validateQuiz(dogQuizData, CAT_SPECIFIC_WORDS) : [];
const dogAnchorErrors = dogAnchorsData ? validateAnchors(dogAnchorsData.dimensions) : [];
const dogCopyErrors = dogCopyData
  ? validateCopy(dogCopyData, copyData.map(c => c.code), CAT_SPECIFIC_WORDS)
  : [];
const dogSpecialErrors = dogSpecialData ? validateSpecial(dogSpecialData, CAT_SPECIFIC_WORDS) : [];
const dogStressErrors = dogStressData
  ? validateStress(dogStressData.questions, dogStressData.levels, (dogQuizData ?? []).map(q => q.id), {
      forbiddenWords: CAT_SPECIFIC_WORDS,
      indicators: dogStressData.indicators,
    })
  : [];
const dogAdviceErrors = dogAdviceData ? validateCompareAdvice(dogAdviceData, CAT_SPECIFIC_WORDS) : [];
const dogSourceErrors = dogSourceData ? validateDimensionSources(dogSourceData) : [];

console.log('=== 题库校验 ===');
if (quizErrors.length === 0) console.log('OK：45 题全部通过');
else quizErrors.forEach(e => console.log('ERROR:', e));

console.log('\n=== 文案校验 ===');
if (copyErrors.length === 0) console.log('OK：16 型文案全部通过');
else copyErrors.forEach(e => console.log('ERROR:', e));

console.log('\n=== 压力信号校验 ===');
if (stressErrors.length === 0) console.log('OK：4 题与两档文案通过');
else stressErrors.forEach(e => console.log('ERROR:', e));

console.log('\n=== 兜底型/隐藏型校验 ===');
if (specialErrors.length === 0) console.log('OK：兜底型与隐藏型文案通过');
else specialErrors.forEach(e => console.log('ERROR:', e));

console.log('\n=== 比较建议校验 ===');
if (adviceErrors.length === 0) console.log('OK：' + Object.keys(adviceData).length + ' 维比较建议通过：' + Object.keys(adviceData).join(' / '));
else adviceErrors.forEach(e => console.log('ERROR:', e));

console.log('\n=== 猫册维度出处校验 ===');
if (sourceErrors.length === 0) {
  console.log('OK：15 维出处与 ' + sourceData.references.length + ' 条引用文献齐备' + pendingNote(sourceData));
} else {
  sourceErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册题库校验 ===');
if (!dogQuizData) {
  console.log('SKIP：content/quiz-dog.json 不存在');
} else if (dogQuizErrors.length === 0) {
  const reverseCount = dogQuizData.filter(q => q.reverse).length;
  const singlePetCount = dogQuizData.filter(q => q.singlePet === true).length;
  console.log('OK：45 题全部通过（反向 ' + reverseCount + '，singlePet ' + singlePetCount + '）');
} else {
  dogQuizErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册维度锚点校验 ===');
if (!dogAnchorsData) {
  console.log('SKIP：content/dimensions-dog.json 不存在');
} else if (dogAnchorErrors.length === 0) {
  console.log('OK：15 维 × L/H 共 30 条锚点通过，无猫册专属词');
} else {
  dogAnchorErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册 16 型文案校验 ===');
if (!dogCopyData) {
  console.log('SKIP：content/copy-dog.json 不存在');
} else if (dogCopyErrors.length === 0) {
  const union = new Set([...copyData.map(c => c.code), ...dogCopyData.map(c => c.code)]);
  console.log('OK：16 型文案通过，猫狗代码并集 ' + union.size + ' 个且无重复');
} else {
  dogCopyErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册特殊型校验 ===');
if (!dogSpecialData) {
  console.log('SKIP：content/special-dog.json 不存在');
} else if (dogSpecialErrors.length === 0) {
  console.log('OK：隐藏型「' + dogSpecialData.hidden.name + '」与兜底型文案通过，无猫册专属词');
} else {
  dogSpecialErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册压力信号校验 ===');
if (!dogStressData) {
  console.log('SKIP：content/stress-dog.json 不存在');
} else if (dogStressErrors.length === 0) {
  console.log('OK：4 题与两档文案通过，2 个指标各 2 题，含文献出处，无禁用词/诊断词/猫册专属词');
} else {
  dogStressErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册比较建议校验 ===');
if (!dogAdviceData) {
  console.log('SKIP：content/compare-advice-dog.json 不存在');
} else if (dogAdviceErrors.length === 0) {
  console.log('OK：' + Object.keys(dogAdviceData).length + ' 维比较建议通过：' + Object.keys(dogAdviceData).join(' / ') + '；无禁用词/诊断词/猫册专属词');
} else {
  dogAdviceErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册维度出处校验 ===');
if (!dogSourceData) {
  console.log('SKIP：content/dimension-sources-dog.json 不存在');
} else if (dogSourceErrors.length === 0) {
  console.log('OK：15 维出处与 ' + dogSourceData.references.length + ' 条引用文献齐备' + pendingNote(dogSourceData));
} else {
  dogSourceErrors.forEach(e => console.log('ERROR:', e));
}

console.log('\n=== 狗册资产清单 ===');
const dogAssets: Array<[string, boolean, string]> = [
  ['quiz-dog.json', dogQuizData !== null, '45 题'],
  ['dimensions-dog.json', dogAnchorsData !== null, '30 条锚点'],
  ['copy-dog.json', dogCopyData !== null, '16 型文案'],
  ['special-dog.json', dogSpecialData !== null, '隐藏型/兜底型'],
  ['stress-dog.json', dogStressData !== null, '4 压力题 + 两档文案'],
  ['compare-advice-dog.json', dogAdviceData !== null, '比较建议'],
];
for (const [name, ready, desc] of dogAssets) {
  console.log((ready ? 'READY ' : 'MISSING ') + name + '（' + desc + '）');
}
const dogMissing = dogAssets.filter(([, ready]) => !ready).map(([name]) => name);
if (dogMissing.length > 0) console.log('狗册资产缺失：' + dogMissing.join('、'));
else console.log('狗册资产齐备');

const allErrors = [
  ...quizErrors,
  ...copyErrors,
  ...stressErrors,
  ...specialErrors,
  ...adviceErrors,
  ...sourceErrors,
  ...dogQuizErrors,
  ...dogAnchorErrors,
  ...dogCopyErrors,
  ...dogSpecialErrors,
  ...dogStressErrors,
  ...dogAdviceErrors,
  ...dogSourceErrors,
];
if (allErrors.length > 0) process.exit(1);
