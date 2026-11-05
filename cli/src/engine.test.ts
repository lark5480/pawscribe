import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreQuestion, scoreQuiz, scoreStress } from '../../lib/engine/scoring.ts';
import { HIDDEN_DIMENSIONS, manhattan, matchType, isHiddenType } from '../../lib/engine/matching.ts';
import { resolveTypeCopy } from '../../lib/engine/result.ts';
import { compareVectors, resolveCompareSpecies } from '../../lib/engine/compare.ts';
import { encodeVector, decodeVector } from '../../lib/engine/codec.ts';
import { validateQuiz, validateCopy, validateStress, validateSpecial, validateCompareAdvice, validateAnchors, CAT_SPECIFIC_WORDS } from '../../lib/engine/validator.ts';
import type { DimensionAnchor } from '../../lib/engine/validator.ts';
import { diffRecords } from '../../lib/engine/trace.ts';
import { createQuizOrder, isValidQuizOrder } from '../../lib/engine/order.ts';
import { getSpeciesData, hasSpeciesData } from '../../lib/engine/data.ts';
import { daysSince, latestRecency, recencyLabel } from '../../lib/engine/time.ts';
import type { TraceRecord } from '../../lib/engine/trace.ts';
import {
  HISTORY_KEY,
  LEGACY_PET_ID,
  STRESS_KEY_PREFIX,
  appendHistory,
  clearHistoryForSpecies,
  historySpeciesPresent,
  mergeRecord,
  migrateRecordPetId,
  normalizeRecords,
  petIdForSpecies,
  readHistory,
  readStress,
  writeStress,
} from '../../lib/store/history.ts';
import type { Question, SpecialTypeCopy, StressQuestion, TypeCopy, TypeTemplate, Vector } from '../../lib/engine/types.ts';

const quiz = JSON.parse(readFileSync(new URL('../../content/quiz-cat.json', import.meta.url), 'utf8')) as Question[];
const stress = JSON.parse(readFileSync(new URL('../../content/stress-cat.json', import.meta.url), 'utf8')) as {
  questions: StressQuestion[];
  levels: Array<{ level: string; label: string; text: string }>;
};
const copies = JSON.parse(readFileSync(new URL('../../content/copy-cat.json', import.meta.url), 'utf8')) as TypeCopy[];
const special = JSON.parse(readFileSync(new URL('../../content/special-cat.json', import.meta.url), 'utf8')) as {
  hidden: SpecialTypeCopy;
  fallback: SpecialTypeCopy;
};
const typeData = JSON.parse(readFileSync(new URL('../../content/types.json', import.meta.url), 'utf8')) as {
  types: Array<{ index: number; vector: Vector; vectorStr: string }>;
};
const templates: TypeTemplate[] = typeData.types.map(t => ({ index: t.index, vector: t.vector, vectorStr: t.vectorStr }));
const advice = JSON.parse(readFileSync(new URL('../../content/compare-advice.json', import.meta.url), 'utf8')) as Record<string, { suggestion: string }>;
const dogQuiz = JSON.parse(readFileSync(new URL('../../content/quiz-dog.json', import.meta.url), 'utf8')) as Question[];
const dogAnchorsData = JSON.parse(readFileSync(new URL('../../content/dimensions-dog.json', import.meta.url), 'utf8')) as {
  dimensions: DimensionAnchor[];
};
const dogCopies = JSON.parse(readFileSync(new URL('../../content/copy-dog.json', import.meta.url), 'utf8')) as TypeCopy[];
const dogSpecial = JSON.parse(readFileSync(new URL('../../content/special-dog.json', import.meta.url), 'utf8')) as {
  hidden: SpecialTypeCopy;
  fallback: SpecialTypeCopy;
};
const dogStress = JSON.parse(readFileSync(new URL('../../content/stress-dog.json', import.meta.url), 'utf8')) as {
  indicators: Array<{ id: string; name: string; source: string; pending: string }>;
  questions: StressQuestion[];
  levels: Array<{ level: string; label: string; text: string }>;
};
const dogAdvice = JSON.parse(readFileSync(new URL('../../content/compare-advice-dog.json', import.meta.url), 'utf8')) as Record<string, { suggestion: string }>;

const toTemplate = (vector: Vector): TypeTemplate => ({ index: 0, vector, vectorStr: '' });
const toCopy = (code: string): TypeCopy => ({ index: 0, code, name: code, vector: '', hook: '', tips: [], breed: '' });

test('base36 往返：全 L / 全 H / 交错 / 全 M', () => {
  const vectors: Vector[] = [
    Array(15).fill(0),
    Array(15).fill(2),
    [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2],
    Array(15).fill(1),
  ];
  for (const v of vectors) {
    const code = encodeVector(v);
    assert.deepEqual(decodeVector(code), v, '往返失败：' + code);
  }
});

test('base36 解码拒绝非法字符与越界余数', () => {
  assert.equal(decodeVector('ABC!'), null);
  assert.equal(decodeVector('ZZZZZZ'), null);
  assert.deepEqual(decodeVector('0'), Array(15).fill(0));
});

test('DART 样例：类型库链接 code 为 JI 且可解码回模板', () => {
  const dart = copies.find((copy) => copy.code === 'DART');
  assert.ok(dart);
  const template = templates.find((item) => item.index === dart.index);
  assert.ok(template);
  const code = encodeVector(template.vector);
  assert.equal(code, 'JI');
  assert.deepEqual(decodeVector(code), template.vector);
});

test('daysSince 按本地日历日计算，非法与未来安全降级', () => {
  const now = new Date(2026, 10, 5, 9, 30);
  assert.equal(daysSince(new Date(2026, 10, 5, 23, 0).toISOString(), now), 0);
  assert.equal(daysSince(new Date(2026, 10, 4, 23, 0).toISOString(), now), 1);
  assert.equal(daysSince(new Date(2026, 10, 2, 8, 0).toISOString(), now), 3);
  assert.equal(daysSince(new Date(2026, 10, 9, 8, 0).toISOString(), now), 0);
  assert.equal(daysSince('not-a-date', now), null);
});

test('recencyLabel 返回今天 / 昨天 / N 天前', () => {
  const now = new Date(2026, 10, 5, 12);
  assert.equal(recencyLabel(new Date(2026, 10, 5, 1, 0).toISOString(), now), '今天');
  assert.equal(recencyLabel(new Date(2026, 10, 4, 1, 0).toISOString(), now), '昨天');
  assert.equal(recencyLabel(new Date(2026, 9, 29, 1, 0).toISOString(), now), '7 天前');
  assert.equal(recencyLabel('x', now), null);
});

test('latestRecency 取该物种最新记录，忽略乱序与其它物种', () => {
  const now = new Date(2026, 10, 5, 12);
  const records = [
    { species: 'cat' as const, testedAt: new Date(2026, 9, 20, 12).toISOString() },
    { species: 'dog' as const, testedAt: new Date(2026, 10, 4, 12).toISOString() },
    { species: 'cat' as const, testedAt: new Date(2026, 9, 30, 12).toISOString() },
  ];
  assert.equal(latestRecency(records, 'cat', now), '6 天前');
  assert.equal(latestRecency(records, 'dog', now), '昨天');
  assert.equal(latestRecency([], 'cat', now), null);
});

test('反向题按 4-p 翻转', () => {
  const q: Question = { id: 1, dim: 'D1', reverse: true, q: '', options: ['', '', ''] };
  assert.equal(scoreQuestion(q, 0), 3);
  assert.equal(scoreQuestion(q, 1), 2);
  assert.equal(scoreQuestion(q, 2), 1);
  assert.equal(scoreQuestion({ ...q, reverse: false }, 0), 1);
});

test('scoreQuiz 在维度答案不足时明确报错', () => {
  const answers: Record<number, number> = {};
  for (const q of quiz) if (q.id !== 30) answers[q.id] = 0;
  assert.throws(() => scoreQuiz(quiz, answers), /D15 答案不完整/);
});

test('距离 30 边界 → similarity 0 且触发兜底', () => {
  const vector = Array(15).fill(0) as Vector;
  assert.equal(manhattan(vector, Array(15).fill(2) as Vector), 30);
  const match = matchType(vector, [toTemplate(Array(15).fill(2) as Vector)], [toCopy('ZZZZ')]);
  assert.equal(match.similarity, 0);
  assert.equal(match.isFallback, true);
});

test('距离并列时优先精确匹配维度更多的类型', () => {
  const vector = Array(15).fill(0) as Vector;
  const a = Array(15).fill(0) as Vector;
  a[0] = 1;
  a[1] = 1;
  const b = Array(15).fill(0) as Vector;
  b[0] = 2;
  const match = matchType(vector, [toTemplate(a), toTemplate(b)], [toCopy('AAAA'), toCopy('BBBB')]);
  assert.equal(manhattan(vector, a), 2);
  assert.equal(manhattan(vector, b), 2);
  assert.equal(match.code, 'BBBB');
});

test('最高相似度 <60 触发兜底', () => {
  const vector = Array(15).fill(0) as Vector;
  const match = matchType(vector, [toTemplate(Array(15).fill(1) as Vector)], [toCopy('MISS')]);
  assert.equal(match.similarity, 50);
  assert.equal(match.isFallback, true);
});

test('隐藏型规则 D4/D5/D6 全 H', () => {
  const vector = Array(15).fill(0) as Vector;
  vector[3] = 2;
  vector[4] = 2;
  vector[5] = 2;
  assert.equal(isHiddenType(vector), true);
  const normal = Array(15).fill(0) as Vector;
  normal[5] = 2;
  assert.equal(isHiddenType(normal), false);
});

test('题库与压力题 id 不重叠，计分互不干扰', () => {
  const quizIds = quiz.map(q => q.id);
  for (const q of stress.questions) assert.equal(quizIds.includes(q.id), false, 'id 冲突：' + q.id);

  const answers: Record<number, number> = {};
  quiz.forEach(q => { answers[q.id] = 2; });
  stress.questions.forEach(q => { answers[q.id] = 0; });
  assert.equal(scoreQuiz(quiz, answers)[0], 2);
  assert.equal(scoreStress(answers, stress.questions.map(q => q.id)), 0);

  const stressOnly: Record<number, number> = {};
  quiz.forEach(q => { stressOnly[q.id] = 0; });
  stress.questions.forEach(q => { stressOnly[q.id] = 2; });
  assert.equal(scoreQuiz(quiz, stressOnly)[0], 0);
  assert.equal(scoreStress(stressOnly, stress.questions.map(q => q.id)), 100);
});

test('压力分取 4 题均值，落在 0-100', () => {
  const ids = stress.questions.map(q => q.id);
  const make = (v: number) => Object.fromEntries(ids.map(id => [id, v]));
  assert.equal(scoreStress(make(0), ids), 0);
  assert.equal(scoreStress(make(1), ids), 50);
  assert.equal(scoreStress(make(2), ids), 100);
});

test('validateQuiz 校验每维 3 题；validateStress 校验 id 冲突', () => {
  const broken = quiz.filter(q => q.id !== 30);
  assert.ok(validateQuiz(broken).some(e => e.includes('D15 题量应为 3')));
  const conflict = [...stress.questions.map(q => ({ ...q, id: q.id - 100 }))];
  assert.ok(validateStress(conflict, stress.levels, quiz.map(q => q.id)).some(e => e.includes('与题库冲突')));
});

test('题库与压力题内容文件通过既有校验', () => {
  assert.deepEqual(validateQuiz(quiz), []);
  assert.deepEqual(validateStress(stress.questions, stress.levels, quiz.map(q => q.id)), []);
});

test('隐藏型替换 16 型文案', () => {
  const vector = Array(15).fill(0) as Vector;
  vector[1] = 1;
  vector[3] = 2;
  vector[4] = 2;
  vector[5] = 2;
  const match = matchType(vector, templates, copies);
  assert.equal(match.isHidden, true);
  assert.equal(match.isFallback, false);
  const resolved = resolveTypeCopy(match, copies, special);
  assert.equal(resolved.kind, 'hidden');
  assert.equal(resolved.name, '纸箱工程师');
  assert.equal(resolved.code, undefined);
  assert.equal(resolved.tips.length, 3);
});

test('16 型模板精确命中时均返回自身类型', () => {
  for (const t of templates) {
    const match = matchType(t.vector, templates, copies);
    assert.equal(match.typeIndex, t.index, '模板不可达：' + copies[t.index].code);
    assert.equal(match.isHidden, false, '精确命中不应隐藏：' + copies[t.index].code);
    assert.equal(match.isFallback, false, '精确命中不应兜底：' + copies[t.index].code);
  }
});

test('ALFA 与 DART 精确命中不再返回隐藏型', () => {
  for (const code of ['ALFA', 'DART']) {
    const index = copies.findIndex((c) => c.code === code);
    assert.notEqual(index, -1);
    const match = matchType(templates[index].vector, templates, copies);
    assert.equal(match.isHidden, false);
    const resolved = resolveTypeCopy(match, copies, special);
    assert.equal(resolved.kind, 'normal');
    assert.equal(resolved.code, code);
  }
});

test('距离 ≥1 且 D4/D5/D6 全 H 仍触发隐藏型', () => {
  const vector = Array(15).fill(0) as Vector;
  vector[1] = 1;
  vector[3] = 2;
  vector[4] = 2;
  vector[5] = 2;
  const dartIndex = copies.findIndex((c) => c.code === 'DART');
  assert.equal(manhattan(vector, templates[dartIndex].vector), 1);
  const match = matchType(vector, templates, copies);
  assert.equal(match.isHidden, true);
  assert.equal(match.isFallback, false);
  assert.equal(resolveTypeCopy(match, copies, special).kind, 'hidden');
});

test('隐藏型优先于兜底型', () => {
  const dartIndex = copies.findIndex((c) => c.code === 'DART');
  const vector = Array(15).fill(2) as Vector;
  const match = matchType(vector, [templates[dartIndex]], [toCopy('DART')]);
  assert.ok(match.similarity < 60);
  assert.equal(match.isHidden, true);
  assert.equal(match.isFallback, false);
  assert.equal(resolveTypeCopy(match, [toCopy('DART')], special).kind, 'hidden');
});

test('兜底型替换 16 型文案', () => {
  const match = matchType(Array(15).fill(0) as Vector, [toTemplate(Array(15).fill(1) as Vector)], [toCopy('MISS')]);
  const resolved = resolveTypeCopy(match, copies, special);
  assert.equal(match.isFallback, true);
  assert.equal(resolved.kind, 'fallback');
  assert.equal(resolved.name, special.fallback.name);
  assert.equal(resolved.tips.length, 3);
});

test('真实 16 型模板下也存在相似度 <60 的向量', () => {
  const vector = [2, 1, 1, 0, 0, 2, 0, 1, 1, 2, 2, 0, 1, 2, 2] as Vector;
  const match = matchType(vector, templates, copies);
  assert.equal(match.similarity, 57);
  assert.equal(match.isFallback, true);
  assert.equal(resolveTypeCopy(match, copies, special).kind, 'fallback');
});

test('普通向量仍走 16 型文案', () => {
  const resolved = resolveTypeCopy(matchType(Array(15).fill(0) as Vector, templates, copies), copies, special);
  assert.equal(resolved.kind, 'normal');
  assert.equal(resolved.code, 'SOLI');
  assert.equal(resolved.breed !== undefined, true);
});

test('兜底型/隐藏型内容通过校验', () => {
  assert.deepEqual(validateSpecial(special), []);
});

test('compare：相同 code → 距离 0、合作度 100、无冲突', () => {
  const same = Array(15).fill(1) as Vector;
  const result = compareVectors(same, same);
  assert.equal(result.distance, 0);
  assert.equal(result.cooperation, 100);
  assert.deepEqual(result.conflicts, []);
});

test('compare：最大距离 30 → 合作度 0', () => {
  const result = compareVectors(Array(15).fill(0) as Vector, Array(15).fill(2) as Vector);
  assert.equal(result.distance, 30);
  assert.equal(result.cooperation, 0);
});

test('compare：双方 D11 均为 H 才产生冲突', () => {
  const a = Array(15).fill(0) as Vector;
  a[10] = 2;
  const b = Array(15).fill(0) as Vector;
  b[10] = 2;
  assert.deepEqual(compareVectors(a, b).conflicts, [{ dim: 'D11', aLevel: 2, bLevel: 2 }]);

  const single = Array(15).fill(0) as Vector;
  single[10] = 1;
  assert.deepEqual(compareVectors(a, single).conflicts, []);
});

test('compare：非法向量明确报错', () => {
  assert.throws(() => compareVectors(Array(14).fill(0) as unknown as Vector, Array(15).fill(0) as Vector), /应为 15 维/);
  const bad = Array(15).fill(0) as number[];
  bad[0] = 3;
  assert.throws(() => compareVectors(bad as unknown as Vector, Array(15).fill(0) as Vector), /只能是 0\/1\/2/);
});

test('比较建议只收录 D11 且通过校验', () => {
  assert.deepEqual(Object.keys(advice), ['D11']);
  assert.deepEqual(validateCompareAdvice(advice), []);
});

const dimNames = Array.from({ length: 15 }, (_, i) => '维度' + (i + 1));

function record(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    id: 'r1',
    species: 'cat',
    petId: 'default',
    code: '0',
    vector: Array(15).fill(0) as Vector,
    testedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('trace：0 变化 → 方向全为 same，固定总结', () => {
  const base = record();
  const latest = record({ id: 'r2', testedAt: '2026-02-01T00:00:00.000Z' });
  const diff = diffRecords(base, latest, dimNames);
  assert.equal(diff.changedCount, 0);
  assert.ok(diff.deltas.every((d) => d.direction === 'same'));
  assert.deepEqual(diff.summary, ['和上次相比没有变化']);
});

test('trace：方向、跨两档与总结排序', () => {
  const baseVector = Array(15).fill(1) as Vector;
  baseVector[2] = 0;
  baseVector[3] = 2;
  const latestVector = Array(15).fill(1) as Vector;
  latestVector[0] = 2;
  latestVector[1] = 0;
  latestVector[2] = 2;
  latestVector[3] = 0;

  const diff = diffRecords(
    record({ vector: baseVector }),
    record({ id: 'r2', vector: latestVector, testedAt: '2026-02-01T00:00:00.000Z' }),
    dimNames,
  );

  assert.equal(diff.deltas[0].direction, 'up');
  assert.equal(diff.deltas[1].direction, 'down');
  assert.equal(diff.deltas[2].crossTwoLevels, true);
  assert.equal(diff.deltas[3].crossTwoLevels, true);
  assert.equal(diff.changedCount, 4);
  assert.equal(diff.summary.length, 3);
  assert.equal(diff.summary[0], '维度3从 L 升到 H（跨两档）');
  assert.equal(diff.summary[1], '维度4从 H 降到 L（跨两档）');
});

test('trace：非法向量与不同宠物明确报错', () => {
  assert.throws(() => diffRecords(record({ vector: Array(14).fill(0) as unknown as Vector }), record(), dimNames), /应为 15 维/);
  const bad = Array(15).fill(0) as number[];
  bad[0] = 3;
  assert.throws(() => diffRecords(record({ vector: bad as unknown as Vector }), record(), dimNames), /只能是 0\/1\/2/);
  assert.throws(() => diffRecords(record(), record({ petId: 'other' }), dimNames), /同一只宠物/);
});

test('trace：额外压力字段不参与 diff', () => {
  const base = record();
  const latest = record({ id: 'r2', testedAt: '2026-02-01T00:00:00.000Z' });
  const withStress = { ...base, stress: 100 } as TraceRecord & { stress: number };
  assert.deepEqual(diffRecords(withStress, latest, dimNames), diffRecords(base, latest, dimNames));
});

test('history：24h 内同宠物同 code 合并，超时或换 code 不合并', () => {
  const first = record({ id: 'a', testedAt: '2026-01-01T00:00:00.000Z' });
  const within = record({ id: 'b', testedAt: '2026-01-01T10:00:00.000Z' });
  const merged = mergeRecord([first], within);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'b');

  const otherCode = record({ id: 'c', code: '1', testedAt: '2026-01-01T10:00:00.000Z' });
  assert.equal(mergeRecord([within], otherCode).length, 2);

  const later = record({ id: 'd', testedAt: '2026-01-03T10:00:00.000Z' });
  assert.equal(mergeRecord([within], later).length, 2);
});

test('history：每个宠物保留 20 条，超出删除最旧', () => {
  const records = Array.from({ length: 25 }, (_, i) =>
    record({ id: 'r' + i, testedAt: '2026-01-' + String(i + 1).padStart(2, '0') + 'T00:00:00.000Z' }),
  );
  const result = mergeRecord(records, record({ id: 'new', testedAt: '2026-01-26T00:00:00.000Z' }));
  assert.equal(result.length, 20);
  assert.equal(result[0].id, 'new');
  assert.equal(result.some((r) => r.id === 'r0'), false);
});

test('history：坏记录被丢弃，合法记录保留', () => {
  const good = record();
  assert.deepEqual(normalizeRecords([good, { ...good, vector: [1, 2] }, null, 'bad']), [good]);
});

test('history：解析失败与版本不符降级为空历史', () => {
  const broken = memoryStorage({ [HISTORY_KEY]: '{bad json' });
  assert.deepEqual(readHistory(broken), { records: [], available: true, degraded: true });

  const wrongVersion = memoryStorage({ [HISTORY_KEY]: JSON.stringify({ version: 2, records: [] }) });
  assert.deepEqual(readHistory(wrongVersion), { records: [], available: true, degraded: true });
});

test('history：存储不可用时不崩溃并返回原因', () => {
  assert.deepEqual(readHistory(null), { records: [], available: false, degraded: false });
  const write = appendHistory(record(), null);
  assert.equal(write.ok, false);
  assert.equal(write.reason, 'unavailable');
});

test('history：版本不符时写入可重写为当前版本', () => {
  const storage = memoryStorage({ [HISTORY_KEY]: JSON.stringify({ version: 2, records: [] }) });
  const write = appendHistory(record(), storage);
  assert.equal(write.ok, true);
  assert.equal(write.records.length, 1);
  const raw = JSON.parse(storage.getItem(HISTORY_KEY) || '{}');
  assert.equal(raw.version, 1);
});

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('order：题目集合不丢失不重复，选项均为 0/1/2 的排列', () => {
  const order = createQuizOrder(quiz, stress.questions, seeded(1));
  const quizIds = quiz.map((q) => q.id);
  const stressIds = stress.questions.map((q) => q.id);

  assert.equal(order.quiz.length, quizIds.length);
  assert.equal(new Set(order.quiz).size, quizIds.length);
  assert.deepEqual([...order.quiz].sort((a, b) => a - b), [...quizIds].sort((a, b) => a - b));

  assert.equal(order.stress.length, stressIds.length);
  assert.equal(new Set(order.stress).size, stressIds.length);
  assert.deepEqual([...order.stress].sort((a, b) => a - b), [...stressIds].sort((a, b) => a - b));

  for (const id of [...quizIds, ...stressIds]) {
    assert.deepEqual([...order.options[id]].sort(), [0, 1, 2], '选项下标不是完整排列：' + id);
  }
});

test('order：选项显示顺序映射回原始分值，反向题语义不变', () => {
  const order = createQuizOrder(quiz, stress.questions, seeded(7));
  for (const q of quiz) {
    const perm = order.options[q.id];
    for (const original of [0, 1, 2] as const) {
      const displayIndex = perm.indexOf(original);
      const clicked = perm[displayIndex];
      // 用户看到并点下的是原文第 original 个选项，回传的原始下标必须仍是 original
      assert.equal(clicked, original);
      assert.equal(q.options[clicked], q.options[original]);
      assert.equal(scoreQuestion(q, clicked), scoreQuestion(q, original));
    }
    const shownTexts = perm.map((original) => q.options[original]);
    assert.equal(new Set(shownTexts).size, 3, '选项文本重复：' + q.id);
  }

  const reverse = quiz.find((q) => q.reverse);
  assert.ok(reverse);
  const perm = order.options[reverse.id];
  assert.deepEqual([...perm.map((original) => scoreQuestion(reverse, original))].sort(), [1, 2, 3]);
});

test('order：同一份答案在不同顺序下得分一致', () => {
  const orderA = createQuizOrder(quiz, stress.questions, seeded(11));
  const orderB = createQuizOrder(quiz, stress.questions, seeded(23));
  assert.notDeepEqual(orderA.quiz, orderB.quiz, '两次打乱顺序应不同');

  // 按题意作答：每题选原始下标 (id % 3)
  const answers: Record<number, number> = {};
  for (const q of quiz) answers[q.id] = q.id % 3;
  for (const q of stress.questions) answers[q.id] = 1;

  // 模拟用户按显示顺序点击：先找到该选项的显示位次，再回传映射后的原始下标
  const replay = (order: typeof orderA): Record<number, number> => {
    const picked: Record<number, number> = {};
    for (const q of quiz) {
      const target = answers[q.id];
      const displayIndex = order.options[q.id].indexOf(target);
      picked[q.id] = order.options[q.id][displayIndex];
    }
    for (const q of stress.questions) {
      const target = answers[q.id];
      const displayIndex = order.options[q.id].indexOf(target);
      picked[q.id] = order.options[q.id][displayIndex];
    }
    return picked;
  };

  const pickedA = replay(orderA);
  const pickedB = replay(orderB);
  assert.deepEqual(scoreQuiz(quiz, pickedA), scoreQuiz(quiz, answers));
  assert.deepEqual(scoreQuiz(quiz, pickedB), scoreQuiz(quiz, answers));
  assert.deepEqual(
    scoreStress(pickedA, stress.questions.map((q) => q.id)),
    scoreStress(answers, stress.questions.map((q) => q.id)),
  );
  assert.deepEqual(
    scoreStress(pickedB, stress.questions.map((q) => q.id)),
    scoreStress(answers, stress.questions.map((q) => q.id)),
  );
});

test('order：持久化顺序校验拒绝缺失、重复与非法排列', () => {
  const quizIds = quiz.map((q) => q.id);
  const stressIds = stress.questions.map((q) => q.id);
  const valid = createQuizOrder(quiz, stress.questions, seeded(3));
  assert.equal(isValidQuizOrder(valid, quizIds, stressIds), true);

  assert.equal(isValidQuizOrder(null, quizIds, stressIds), false);
  assert.equal(isValidQuizOrder({ ...valid, quiz: valid.quiz.slice(1) }, quizIds, stressIds), false);

  const duplicated = [...valid.quiz];
  duplicated[1] = duplicated[0];
  assert.equal(isValidQuizOrder({ ...valid, quiz: duplicated }, quizIds, stressIds), false);

  const badOptions = { ...valid.options, [quizIds[0]]: [0, 0, 1] };
  assert.equal(isValidQuizOrder({ ...valid, options: badOptions }, quizIds, stressIds), false);

  const missingOptions = { ...valid.options };
  delete missingOptions[stressIds[0]];
  assert.equal(isValidQuizOrder({ ...valid, options: missingOptions }, quizIds, stressIds), false);
});

test('物种数据：猫狗双册完整接入，狗册资产均为狗版', () => {
  const cat = getSpeciesData('cat');
  assert.ok(cat);
  assert.equal(cat.species, 'cat');
  assert.equal(cat.dimensions.length, 15);
  assert.equal(cat.questions.length, 45);
  assert.equal(cat.stressQuestions.length, 4);
  assert.equal(cat.stressLevels.length, 2);
  assert.equal(cat.typeTemplates.length, 16);
  assert.equal(cat.typeCopies.length, 16);

  const dog = getSpeciesData('dog');
  assert.ok(dog);
  assert.equal(dog.species, 'dog');
  assert.equal(dog.questions.length, 45);
  assert.equal(dog.stressQuestions.length, 4);
  assert.equal(dog.stressLevels.length, 2);
  assert.equal(dog.typeTemplates.length, 16);
  assert.equal(dog.typeCopies.length, 16);
  assert.equal(dog.dimensions.length, 15);

  // 维度名与模型沿用猫咪骨架，L/H 两端必须来自狗锚点
  const dogAnchorMap = new Map(dogAnchorsData.dimensions.map((d) => [d.id, d]));
  for (const d of dog.dimensions) {
    const anchor = dogAnchorMap.get(d.id);
    assert.ok(anchor, '狗册缺少 ' + d.id + ' 锚点');
    assert.equal(d.lowDesc, anchor.lowDesc, d.id + ' L 端未使用狗锚点');
    assert.equal(d.highDesc, anchor.highDesc, d.id + ' H 端未使用狗锚点');
  }

  assert.deepEqual(dog.specialTypes, dogSpecial);
  assert.deepEqual(dog.compareAdvice, dogAdvice);
  assert.equal(dog.stressQuestions.length, dogStress.questions.length);
  assert.deepEqual(dog.stressQuestions, dogStress.questions);
  assert.deepEqual(dog.stressLevels, dogStress.levels);
  assert.deepEqual(dog.hiddenVector, [0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0]);

  assert.equal(hasSpeciesData('cat'), true);
  assert.equal(hasSpeciesData('dog'), true);
});

test('隐藏型维度按物种参数化：猫 D4/D5/D6，狗 D4/D6/D14', () => {
  assert.deepEqual(HIDDEN_DIMENSIONS.cat, [3, 4, 5]);
  assert.deepEqual(HIDDEN_DIMENSIONS.dog, [3, 5, 13]);

  const catVector = Array(15).fill(0) as Vector;
  catVector[3] = 2;
  catVector[4] = 2;
  catVector[5] = 2;
  assert.equal(isHiddenType(catVector, 'cat'), true);
  assert.equal(isHiddenType(catVector, 'dog'), false);

  const dogVector = Array(15).fill(0) as Vector;
  dogVector[3] = 2;
  dogVector[5] = 2;
  dogVector[13] = 2;
  assert.equal(isHiddenType(dogVector, 'dog'), true);
  assert.equal(isHiddenType(dogVector, 'cat'), false);
});

test('狗隐藏型需距离 ≥1 且非精确命中', () => {
  const vector = Array(15).fill(0) as Vector;
  vector[3] = 2;
  vector[5] = 2;
  vector[13] = 2;
  const match = matchType(vector, templates, copies, 'dog');
  assert.ok(manhattan(vector, templates[match.typeIndex].vector) >= 1);
  assert.equal(match.isHidden, true);
  for (const t of templates) {
    assert.equal(matchType(t.vector, templates, copies, 'dog').isHidden, false, '精确命中不应隐藏：' + t.index);
  }
});

test('compare 物种裁决：默认同物种，跨物种明确拒绝', () => {
  assert.deepEqual(resolveCompareSpecies({}), { ok: true, species: 'cat', speciesA: 'cat', speciesB: 'cat' });
  assert.equal(resolveCompareSpecies({ species: 'dog' }).species, 'dog');
  assert.equal(resolveCompareSpecies({ speciesA: 'dog', speciesB: 'dog' }).ok, true);

  const cross = resolveCompareSpecies({ speciesA: 'cat', speciesB: 'dog' });
  assert.equal(cross.ok, false);
  assert.equal(cross.reason, 'cross-species');
  const cross2 = resolveCompareSpecies({ species: 'dog', speciesA: 'dog', speciesB: 'cat' });
  assert.equal(cross2.ok, false);
  assert.equal(cross2.reason, 'cross-species');
});

test('历史 petId 命名空间化：旧 default 迁移且读取后写回', () => {
  assert.equal(LEGACY_PET_ID, 'default');
  assert.equal(petIdForSpecies('cat'), 'cat-default');
  assert.equal(petIdForSpecies('dog'), 'dog-default');

  const legacyCat = record({ id: 'legacy-cat', petId: 'default' });
  const legacyDog = record({ id: 'legacy-dog', species: 'dog', petId: 'default' });
  assert.equal(migrateRecordPetId(legacyCat).petId, 'cat-default');
  assert.equal(migrateRecordPetId(legacyDog).petId, 'dog-default');
  assert.equal(migrateRecordPetId(record({ petId: 'cat-default' })).petId, 'cat-default');

  const storage = memoryStorage({ [HISTORY_KEY]: JSON.stringify({ version: 1, records: [legacyCat, legacyDog] }) });
  const read = readHistory(storage);
  assert.equal(read.records.length, 2);
  assert.equal(read.records[0].petId, 'cat-default');
  assert.equal(read.records[1].petId, 'dog-default');
  const raw = JSON.parse(storage.getItem(HISTORY_KEY) || '{}');
  assert.equal(raw.version, 1);
  assert.equal(raw.records[0].petId, 'cat-default');
  assert.equal(raw.records[1].petId, 'dog-default');
});

test('历史容量按 species+petId 独立计数，猫狗互不挤占', () => {
  const cats = Array.from({ length: 20 }, (_, i) =>
    record({
      id: 'c' + i,
      petId: 'cat-default',
      testedAt: '2026-01-' + String(i + 1).padStart(2, '0') + 'T00:00:00.000Z',
    }),
  );
  const dogs = Array.from({ length: 20 }, (_, i) =>
    record({
      id: 'd' + i,
      species: 'dog',
      petId: 'dog-default',
      testedAt: '2026-01-' + String(i + 1).padStart(2, '0') + 'T00:00:00.000Z',
    }),
  );
  const merged = mergeRecord(
    [...cats, ...dogs],
    record({ id: 'new-cat', petId: 'cat-default', testedAt: '2026-01-21T00:00:00.000Z' }),
  );
  assert.equal(merged.length, 40);
  assert.equal(merged.some((r) => r.id === 'new-cat'), true);
  assert.equal(merged.some((r) => r.id === 'c0'), false);
  assert.equal(merged.some((r) => r.id === 'd0'), true);
  assert.equal(merged.filter((r) => r.species === 'dog').length, 20);
});

test('history：清空按物种生效，另一物种记录保留', () => {
  const records = [
    record({ id: 'c1', species: 'cat', petId: 'cat-default' }),
    record({ id: 'c2', species: 'cat', petId: 'cat-default', testedAt: '2026-02-01T00:00:00.000Z' }),
    record({ id: 'd1', species: 'dog', petId: 'dog-default' }),
    record({ id: 'd2', species: 'dog', petId: 'dog-default', testedAt: '2026-02-01T00:00:00.000Z' }),
  ];
  const seed = () => memoryStorage({ [HISTORY_KEY]: JSON.stringify({ version: 1, records }) });

  const dogStorage = seed();
  const clearedDog = clearHistoryForSpecies('dog', dogStorage);
  assert.equal(clearedDog.ok, true);
  assert.deepEqual(clearedDog.records.map((r) => r.id), ['c1', 'c2']);
  assert.equal(readHistory(dogStorage).records.filter((r) => r.species === 'dog').length, 0);
  assert.equal(readHistory(dogStorage).records.filter((r) => r.species === 'cat').length, 2);

  const catStorage = seed();
  const clearedCat = clearHistoryForSpecies('cat', catStorage);
  assert.equal(clearedCat.ok, true);
  assert.deepEqual(clearedCat.records.map((r) => r.id), ['d1', 'd2']);
  assert.equal(readHistory(catStorage).records.filter((r) => r.species === 'cat').length, 0);
  assert.equal(readHistory(catStorage).records.filter((r) => r.species === 'dog').length, 2);

  assert.equal(clearHistoryForSpecies('dog', null).ok, false);
});

test('首页轨迹入口：按物种分别判定，避免点进空页', () => {
  assert.deepEqual(historySpeciesPresent([]), { cat: false, dog: false });
  assert.deepEqual(historySpeciesPresent([record()]), { cat: true, dog: false });
  assert.deepEqual(historySpeciesPresent([record({ species: 'dog', petId: 'dog-default' })]), {
    cat: false,
    dog: true,
  });
  assert.deepEqual(
    historySpeciesPresent([record(), record({ species: 'dog', petId: 'dog-default' })]),
    { cat: true, dog: true },
  );
});

test('禁用词词级：压力文案放行「最近」「第一次」，仍拦截「最好」「绝对」', () => {
  assert.deepEqual(validateStress(stress.questions, stress.levels, quiz.map((q) => q.id), {
    indicators: stress.indicators,
  }), []);
  assert.deepEqual(validateStress(dogStress.questions, dogStress.levels, dogQuiz.map((q) => q.id), {
    forbiddenWords: CAT_SPECIFIC_WORDS,
    indicators: dogStress.indicators,
  }), []);

  const legal = stress.questions.map((q) => ({ ...q }));
  legal[0] = { ...legal[0], q: '最近一个月，第一次发现它在猫砂盆外排泄的次数是？' };
  assert.deepEqual(validateStress(legal, stress.levels, quiz.map((q) => q.id), {
    indicators: stress.indicators,
  }), []);
  const legalText = stress.levels.map((l) => ({ ...l }));
  legalText[1] = { ...legalText[1], text: legalText[1].text + '最初几天先观察，最后再复测。' };
  assert.deepEqual(validateStress(stress.questions, legalText, quiz.map((q) => q.id), {
    indicators: stress.indicators,
  }), []);

  const best = stress.questions.map((q) => ({ ...q }));
  best[0] = { ...best[0], q: '最近一个月，它表现最好的时候是？' };
  const bestErrors = validateStress(best, stress.levels, quiz.map((q) => q.id), {
    indicators: stress.indicators,
  });
  assert.ok(bestErrors.some((e) => e.includes('禁用词「最」')), bestErrors.join('；'));

  const absolute = stress.levels.map((l) => ({ ...l }));
  absolute[1] = { ...absolute[1], text: '这绝对是压力信号。' };
  const absoluteErrors = validateStress(stress.questions, absolute, quiz.map((q) => q.id), {
    indicators: stress.indicators,
  });
  assert.ok(absoluteErrors.some((e) => e.includes('禁用词「绝对」')), absoluteErrors.join('；'));

  // 既有题库检查强度不因词级规则下降：「最好」仍被题库校验拦截
  const quizBad = quiz.map((q) => ({ ...q }));
  quizBad[0] = { ...quizBad[0], q: quizBad[0].q + '，最好选这个' };
  assert.ok(validateQuiz(quizBad).some((e) => e.includes('禁用词「最」')));
});

test('压力分按物种隔离，旧 key 仅猫册回退并迁移', () => {
  const storage = memoryStorage({ [STRESS_KEY_PREFIX]: '80' });
  assert.equal(readStress('dog', storage), null);
  assert.equal(readStress('cat', storage), 80);
  assert.equal(storage.getItem(STRESS_KEY_PREFIX + ':cat'), '80');
  assert.equal(storage.getItem(STRESS_KEY_PREFIX), null);

  writeStress('dog', 10, storage);
  assert.equal(readStress('dog', storage), 10);
  assert.equal(readStress('cat', storage), 80);

  const fresh = memoryStorage();
  writeStress('cat', 0, fresh);
  assert.equal(readStress('cat', fresh), 0);
});

test('诊断词检查覆盖题库、类型文案、压力文案与特殊型文案', () => {
  const badQuiz = [...quiz];
  badQuiz[0] = { ...badQuiz[0], q: badQuiz[0].q + '（需诊断）' };
  assert.ok(validateQuiz(badQuiz).some((e) => e.includes('含诊断词「诊断」')));

  const badCopies = [...copies];
  badCopies[0] = { ...badCopies[0], name: badCopies[0].name + '异常' };
  assert.ok(validateCopy(badCopies).some((e) => e.includes('含诊断词「异常」')));

  const badLevels = [...stress.levels];
  badLevels[0] = { ...badLevels[0], text: badLevels[0].text + '（障碍）' };
  assert.ok(
    validateStress(stress.questions, badLevels, quiz.map((q) => q.id)).some((e) => e.includes('含诊断词「障碍」')),
  );

  const badSpecial = { hidden: { ...special.hidden, note: special.hidden.note + '病症' }, fallback: special.fallback };
  assert.ok(validateSpecial(badSpecial).some((e) => e.includes('含诊断词「病症」')));

  assert.deepEqual(validateCopy(copies), []);
  assert.deepEqual(validateSpecial(special), []);
  assert.deepEqual(validateQuiz(quiz), []);
});

test('D8 兜底由 singlePet 元数据判定，不再依赖题干关键词', () => {
  const d8 = quiz.filter((q) => q.dim === 'D8');
  assert.equal(d8.some((q) => q.singlePet === true), true);

  const without = quiz.filter((q) => q.dim !== 'D8');
  without.push(...d8.map((q) => ({ ...q, singlePet: false })));
  assert.ok(validateQuiz(without).some((e) => e.includes('D8 缺少单宠兜底场景')));
});

test('类型代码建议全局唯一：同册重复与跨册保留代码均报错', () => {
  const dup = [...copies];
  dup[0] = { ...dup[0], code: copies[1].code };
  assert.ok(validateCopy(dup).some((e) => e.includes('代码 ' + copies[1].code + ' 重复')));

  const reserved = validateCopy(copies, [copies[0].code]);
  assert.ok(reserved.some((e) => e.includes('与另一册冲突')));
  assert.deepEqual(validateCopy(copies, []), []);
});

test('狗册题库：合同校验通过，反向 5 题、每维 3 题、D8 单宠 3 题', () => {
  assert.deepEqual(validateQuiz(dogQuiz, CAT_SPECIFIC_WORDS), []);
  assert.equal(dogQuiz.filter((q) => q.reverse).length, 5);
  // 反向题与 D8 单宠题的题号是内容合同的一部分，改动必须同步 PRD §17.5
  assert.deepEqual(dogQuiz.filter((q) => q.reverse).map((q) => q.id), [4, 8, 12, 18, 24]);
  for (let i = 1; i <= 15; i++) {
    assert.equal(dogQuiz.filter((q) => q.dim === 'D' + i).length, 3, 'D' + i + ' 题量错误');
  }
  assert.equal(dogQuiz.filter((q) => q.dim === 'D8' && q.singlePet === true).length, 3);
  assert.deepEqual(dogQuiz.filter((q) => q.dim === 'D8' && q.singlePet === true).map((q) => q.id), [15, 16, 38]);
  const text = dogQuiz.map((q) => q.q + q.options.join('')).join('');
  for (const w of CAT_SPECIFIC_WORDS) assert.equal(text.includes(w), false, '狗题出现猫册词：' + w);
});

test('狗册维度锚点：15 维 × L/H 共 30 条且无猫语残留', () => {
  assert.equal(dogAnchorsData.dimensions.length, 15);
  assert.deepEqual(validateAnchors(dogAnchorsData.dimensions), []);
  const anchors = dogAnchorsData.dimensions.flatMap((d) => [d.lowDesc, d.highDesc]);
  assert.equal(anchors.filter((a) => !!a).length, 30);
  for (const w of CAT_SPECIFIC_WORDS) {
    assert.equal(anchors.join('').includes(w), false, '锚点出现猫册词：' + w);
  }
});

test('校验器能拦截狗册的猫语残留、缺失锚点与禁用词', () => {
  const badQuiz = [...dogQuiz];
  badQuiz[0] = { ...badQuiz[0], q: '猫从窗边走过时，它会？' };
  assert.ok(validateQuiz(badQuiz, CAT_SPECIFIC_WORDS).some((e) => e.includes('含物种专属词「猫」')));
  assert.deepEqual(validateQuiz(badQuiz, []), []);

  const missing = dogAnchorsData.dimensions.filter((d) => d.id !== 'D15');
  assert.ok(validateAnchors(missing).some((e) => e.includes('D15 缺少锚点')));

  const badAnchor = dogAnchorsData.dimensions.map((d) =>
    d.id === 'D1' ? { ...d, lowDesc: '躲在猫砂盆后面' } : d,
  );
  assert.ok(validateAnchors(badAnchor).some((e) => e.includes('含物种专属词「猫」')));

  const bannedAnchor = dogAnchorsData.dimensions.map((d) =>
    d.id === 'D1' ? { ...d, highDesc: '绝对会主动靠近' } : d,
  );
  assert.ok(validateAnchors(bannedAnchor).some((e) => e.includes('含禁用词「绝对」')));
});

test('狗册 16 型文案：合同通过、复用猫册向量、代码与猫册并集唯一', () => {
  assert.deepEqual(validateCopy(dogCopies, copies.map((c) => c.code), CAT_SPECIFIC_WORDS), []);
  assert.equal(dogCopies.length, 16);
  assert.equal(dogCopies.every((c) => /^[A-Z]{4}$/.test(c.code)), true);
  for (const t of templates) {
    const copy = dogCopies.find((c) => c.index === t.index);
    assert.ok(copy, '缺少第 ' + t.index + ' 型');
    assert.equal(copy.vector, t.vectorStr, '第 ' + t.index + ' 型向量未复用猫册');
    assert.equal(copy.tips.length, 3, '第 ' + t.index + ' 型建议应为 3 条');
    assert.ok(copy.breed.includes('Turcsán 2019'), '第 ' + t.index + ' 型品种参考缺少依据');
  }
  const union = new Set([...copies.map((c) => c.code), ...dogCopies.map((c) => c.code)]);
  assert.equal(union.size, 32, '猫狗代码并集应为 32 个且无重复');
  const catNames = new Set(copies.map((c) => c.name));
  for (const c of dogCopies) assert.equal(catNames.has(c.name), false, '狗册中文名与猫册雷同：' + c.name);
});

test('狗册特殊型：隐藏型飞盘永动机、兜底型独立文案通过校验', () => {
  assert.deepEqual(validateSpecial(dogSpecial, CAT_SPECIFIC_WORDS), []);
  assert.equal(dogSpecial.hidden.name, '飞盘永动机');
  assert.equal(dogSpecial.hidden.tips.length, 3);
  assert.notEqual(dogSpecial.fallback.name, special.fallback.name);
});

test('狗册 16 型在狗隐藏规则下均可达，非精确命中 D4/D6/D14 全 H 时触发隐藏型', () => {
  for (const t of templates) {
    const match = matchType(t.vector, templates, dogCopies, 'dog');
    assert.equal(match.typeIndex, t.index, '狗册模板不可达：' + dogCopies[t.index].code);
    assert.equal(match.isHidden, false, '精确命中不应隐藏：' + dogCopies[t.index].code);
    assert.equal(match.isFallback, false, '精确命中不应兜底：' + dogCopies[t.index].code);
    const resolved = resolveTypeCopy(match, dogCopies, dogSpecial);
    assert.equal(resolved.kind, 'normal');
    assert.equal(resolved.code, dogCopies[t.index].code);
  }

  const vector = Array(15).fill(0) as Vector;
  vector[3] = 2;
  vector[5] = 2;
  vector[13] = 2;
  const match = matchType(vector, templates, dogCopies, 'dog');
  assert.ok(manhattan(vector, templates[match.typeIndex].vector) >= 1);
  assert.equal(match.isHidden, true);
  const resolved = resolveTypeCopy(match, dogCopies, dogSpecial);
  assert.equal(resolved.kind, 'hidden');
  assert.equal(resolved.name, '飞盘永动机');
});

test('校验器能拦截狗册文案的猫语残留、跨册代码与缺失字段', () => {
  const withCatWord = dogCopies.map((c) => (c.index === 0 ? { ...c, hook: c.hook + '，像猫一样钻进纸箱' } : c));
  assert.ok(
    validateCopy(withCatWord, copies.map((c) => c.code), CAT_SPECIFIC_WORDS).some((e) =>
      e.includes('含物种专属词「猫」'),
    ),
  );

  const withReservedCode = dogCopies.map((c) => (c.index === 0 ? { ...c, code: copies[0].code } : c));
  assert.ok(
    validateCopy(withReservedCode, copies.map((c) => c.code), CAT_SPECIFIC_WORDS).some((e) =>
      e.includes('与另一册冲突'),
    ),
  );

  const withoutBreed = dogCopies.map((c) => (c.index === 0 ? { ...c, breed: '' } : c));
  assert.ok(validateCopy(withoutBreed, copies.map((c) => c.code), CAT_SPECIFIC_WORDS).some((e) =>
    e.includes('品种参考缺失'),
  ));

  const badSpecial = {
    hidden: { ...dogSpecial.hidden, name: '纸箱工程师' },
    fallback: dogSpecial.fallback,
  };
  assert.ok(
    validateSpecial(badSpecial, CAT_SPECIFIC_WORDS).some((e) => e.includes('含物种专属词「纸箱」')),
  );
});

test('狗册压力题：2 指标 × 2 题、0/50/100、两档文案与文献出处齐备', () => {
  assert.equal(dogStress.indicators.length, 2);
  assert.deepEqual(dogStress.questions.map((q) => q.indicator), ['S1', 'S1', 'S2', 'S2']);
  assert.equal(dogStress.questions.length, 4);
  assert.equal(dogStress.levels.length, 2);
  assert.deepEqual(dogStress.levels.map((l) => l.level), ['normal', 'attention']);
  for (const q of dogStress.questions) {
    assert.deepEqual(q.scores, [0, 50, 100]);
    assert.equal(q.options.length, 3);
    assert.ok(dogStress.indicators.some((i) => i.id === q.indicator), '题目引用了未定义指标：' + q.id);
  }
  for (const i of dogStress.indicators) {
    assert.ok(i.name.length > 0, '指标名称缺失：' + i.id);
    assert.ok(i.source.length > 0, '指标出处缺失：' + i.id);
    assert.equal(typeof i.pending, 'string', '待补文献字段应为字符串：' + i.id);
  }
  // 找不到可靠依据的部分必须显式标注，不能编造
  assert.ok(dogStress.indicators.some((i) => i.pending.includes('待补文献')));
  assert.deepEqual(
    validateStress(dogStress.questions, dogStress.levels, dogQuiz.map((q) => q.id), {
      forbiddenWords: CAT_SPECIFIC_WORDS,
      checkBannedWords: true,
      indicators: dogStress.indicators,
    }),
    [],
  );
});

test('狗册比较建议：只收 D11，覆盖个人空间与护食，无禁用/诊断/猫语', () => {
  assert.deepEqual(Object.keys(dogAdvice), ['D11']);
  assert.ok(dogAdvice.D11.suggestion.includes('个人空间'));
  assert.ok(dogAdvice.D11.suggestion.includes('护食'));
  assert.deepEqual(validateCompareAdvice(dogAdvice, CAT_SPECIFIC_WORDS), []);
});

test('狗册 16 型在数据层 16/16 可达，隐藏向量触发狗隐藏型文案', () => {
  const dog = getSpeciesData('dog');
  assert.ok(dog);
  for (const t of dog.typeTemplates) {
    const match = matchType(t.vector, dog.typeTemplates, dog.typeCopies, 'dog');
    assert.equal(match.typeIndex, t.index, '数据层模板不可达：' + dog.typeCopies[t.index].code);
    assert.equal(match.isHidden, false, '数据层精确命中不应隐藏：' + dog.typeCopies[t.index].code);
    assert.equal(match.isFallback, false, '数据层精确命中不应兜底：' + dog.typeCopies[t.index].code);
    assert.equal(resolveTypeCopy(match, dog.typeCopies, dog.specialTypes).kind, 'normal');
    // 类型库链接用的编码往返后仍命中同一型
    assert.deepEqual(decodeVector(encodeVector(t.vector)), t.vector);
  }

  const match = matchType(dog.hiddenVector, dog.typeTemplates, dog.typeCopies, 'dog');
  assert.ok(manhattan(dog.hiddenVector, dog.typeTemplates[match.typeIndex].vector) >= 1);
  assert.equal(match.isHidden, true);
  assert.equal(match.isFallback, false);
  assert.equal(resolveTypeCopy(match, dog.typeCopies, dog.specialTypes).name, dog.specialTypes.hidden.name);
});

test('类型库隐藏卡向量：编码正确、真正触发隐藏型，且不等于任何 16 型模板', () => {
  for (const species of ['cat', 'dog'] as const) {
    const data = getSpeciesData(species);
    assert.ok(data);
    const expectedCode = species === 'cat' ? 'JL' : '1WCSI';
    assert.equal(encodeVector(data.hiddenVector), expectedCode, species + ' 隐藏卡编码不符');

    for (const t of data.typeTemplates) {
      assert.notDeepEqual(data.hiddenVector, t.vector, species + ' 隐藏卡不应等于模板 ' + t.index);
    }

    const match = matchType(data.hiddenVector, data.typeTemplates, data.typeCopies, species);
    const distance = manhattan(data.hiddenVector, data.typeTemplates[match.typeIndex].vector);
    assert.ok(distance >= 1, species + ' 隐藏卡与最匹配模板距离必须 ≥1');
    if (species === 'cat') assert.equal(distance, 1, '猫隐藏卡应使用距离 1 的向量');
    assert.equal(match.isHidden, true, species + ' 隐藏卡未触发隐藏型');
    const resolved = resolveTypeCopy(match, data.typeCopies, data.specialTypes);
    assert.equal(resolved.kind, 'hidden', species + ' 隐藏卡未解析为隐藏型');
    assert.equal(resolved.name, data.specialTypes.hidden.name, species + ' 隐藏卡未解析为隐藏型文案');
  }
});

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}
