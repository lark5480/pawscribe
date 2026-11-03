import type { Question, StressQuestion } from './types';

// 一轮测试的题目顺序与选项顺序；answers 仍按原始选项下标存储
export interface QuizOrder {
  quiz: number[];
  stress: number[];
  options: Record<number, number[]>;
}

// Fisher–Yates，返回新数组，不修改入参
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// 压力题独立成段：题库打乱后仍在前，压力题打乱后仍在后
export function createQuizOrder(
  quiz: readonly Question[],
  stress: readonly StressQuestion[],
  rand: () => number = Math.random,
): QuizOrder {
  const options: Record<number, number[]> = {};
  for (const q of quiz) options[q.id] = shuffle([0, 1, 2], rand);
  for (const q of stress) options[q.id] = shuffle([0, 1, 2], rand);
  return {
    quiz: shuffle(quiz.map((q) => q.id), rand),
    stress: shuffle(stress.map((q) => q.id), rand),
    options,
  };
}

function isPermutation(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    [0, 1, 2].every((n) => value.includes(n))
  );
}

function sameIdSet(actual: number[], expected: readonly number[]): boolean {
  if (actual.length !== expected.length) return false;
  const set = new Set(actual);
  if (set.size !== expected.length) return false;
  return expected.every((id) => set.has(id));
}

// 校验持久化的顺序是否完整且可续答；不合法时由调用方丢弃旧进度
export function isValidQuizOrder(
  order: unknown,
  quizIds: readonly number[],
  stressIds: readonly number[],
): order is QuizOrder {
  if (!order || typeof order !== 'object') return false;
  const candidate = order as QuizOrder;
  if (!Array.isArray(candidate.quiz) || !Array.isArray(candidate.stress)) return false;
  if (!candidate.options || typeof candidate.options !== 'object') return false;
  if (!sameIdSet(candidate.quiz, quizIds)) return false;
  if (!sameIdSet(candidate.stress, stressIds)) return false;
  return [...quizIds, ...stressIds].every((id) => isPermutation(candidate.options[id]));
}
