import type { Question, Vector, Level } from './types';

// 每题 3 选项 → 1/2/3 分；反向题 points = 4 - p 翻转
export function scoreQuestion(question: Question, choice: number): number {
  const p = choice + 1; // 0/1/2 → 1/2/3
  return question.reverse ? 4 - p : p;
}

// 每维 2 题 → 分数和 2-3 记 L / 4 记 M / 5-6 记 H
export function scoreDimension(scores: number[]): Level {
  const sum = scores.reduce((a, b) => a + b, 0);
  if (sum <= 3) return 0;
  if (sum === 4) return 1;
  return 2;
}

const QUESTIONS_PER_DIM = 2;

// 30 题答案 → 15 维向量；答案不完整时明确报错，避免静默记成 L
export function scoreQuiz(questions: Question[], answers: Record<number, number>): Vector {
  const dimScores: Record<string, number[]> = {};
  for (const q of questions) {
    if (!(q.id in answers)) continue;
    const s = scoreQuestion(q, answers[q.id]);
    if (!dimScores[q.dim]) dimScores[q.dim] = [];
    dimScores[q.dim].push(s);
  }
  const vector: Vector = [];
  for (let i = 1; i <= 15; i++) {
    const dimId = 'D' + i;
    const scores = dimScores[dimId] || [];
    if (scores.length !== QUESTIONS_PER_DIM) {
      throw new Error('维度 ' + dimId + ' 答案不完整：应为 ' + QUESTIONS_PER_DIM + ' 题，实际 ' + scores.length + ' 题');
    }
    vector.push(scoreDimension(scores));
  }
  return vector;
}

// 压力信号 4 题 → 0-100（各题 0/50/100，取均值）
export function scoreStress(answers: Record<number, number>, questionIds: number[]): number {
  if (questionIds.length === 0) throw new Error('压力信号题不能为空');
  let total = 0;
  for (const id of questionIds) {
    if (!(id in answers)) throw new Error('压力信号第 ' + id + ' 题未作答');
    total += answers[id] * 50;
  }
  return Math.round(total / questionIds.length);
}
