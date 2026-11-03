'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSpeciesData } from '@/lib/engine/data';
import { scoreQuiz, scoreStress } from '@/lib/engine/scoring';
import { encodeVector, decodeVector } from '@/lib/engine/codec';
import { createQuizOrder, isValidQuizOrder } from '@/lib/engine/order';
import type { QuizOrder } from '@/lib/engine/order';
import { setPendingResult, writeStress } from '@/lib/store/history';
import type { Species, Question, StressQuestion } from '@/lib/engine/types';

// v3：进度结构加入本轮题目/选项顺序（order），旧版进度无法续答，直接丢弃
const BASE_STORAGE_KEY = 'pawscribe-progress-v3';
const LEGACY_STORAGE_KEYS = ['pawscribe-progress-v2', 'pawscribe-progress'];

function progressKey(species: Species): string {
  return species === 'cat' ? BASE_STORAGE_KEY : BASE_STORAGE_KEY + ':' + species;
}

function resultPath(species: Species, code: string): string {
  return species === 'dog' ? '/dog/result/' + code : '/result/' + code;
}

// 只接受本轮题目的合法下标；异常数据按未作答处理
function sanitizeAnswers(value: unknown, map: Map<number, Question | StressQuestion>): Record<number, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<number, number> = {};
  for (const [key, choice] of Object.entries(value)) {
    const id = Number(key);
    if (!map.has(id)) continue;
    if (choice !== 0 && choice !== 1 && choice !== 2) continue;
    out[id] = choice;
  }
  return out;
}

export default function TestFlow({ species }: { species: Species }) {
  const router = useRouter();
  const data = getSpeciesData(species)!;
  const questions = data.questions;
  const stressQuestions = data.stressQuestions;
  const quizIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const stressIds = useMemo(() => stressQuestions.map((q) => q.id), [stressQuestions]);
  const totalSteps = questions.length + stressQuestions.length;

  const questionMap = useMemo(() => {
    const map = new Map<number, Question | StressQuestion>();
    for (const q of questions) map.set(q.id, q);
    for (const q of stressQuestions) map.set(q.id, q);
    return map;
  }, [questions, stressQuestions]);

  const storageKey = progressKey(species);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [order, setOrder] = useState<QuizOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let restoredOrder: QuizOrder | null = null;
    let restoredAnswers: Record<number, number> = {};
    let restoredStep = 0;
    try {
      if (species === 'cat') {
        for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
      }
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 顺序不完整或与题库不匹配时，整轮进度作废并重新洗牌
        if (isValidQuizOrder(parsed.order, quizIds, stressIds)) {
          restoredOrder = parsed.order;
          restoredAnswers = sanitizeAnswers(parsed.answers, questionMap);
          if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < totalSteps) {
            restoredStep = parsed.step;
          }
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
    setOrder(restoredOrder ?? createQuizOrder(questions, stressQuestions));
    setAnswers(restoredAnswers);
    setStep(restoredStep);
    setLoaded(true);
  }, [storageKey, species, totalSteps, quizIds, stressIds, questionMap, questions, stressQuestions]);

  useEffect(() => {
    if (!loaded || !order || finishedRef.current) return;
    localStorage.setItem(storageKey, JSON.stringify({ answers, step, order }));
  }, [answers, step, order, loaded, storageKey]);

  if (!loaded || !order) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-center text-stone-400">加载中…</main>;
  }

  const allQuestions = [...order.quiz, ...order.stress]
    .map((id) => questionMap.get(id))
    .filter((q): q is Question | StressQuestion => q !== undefined);
  const current = allQuestions[step];

  function choose(choice: number) {
    const next = { ...answers, [current.id]: choice };
    setAnswers(next);
    if (step + 1 >= totalSteps) {
      finish(next);
    } else {
      setStep(step + 1);
    }
  }

  function finish(finalAnswers: Record<number, number>) {
    finishedRef.current = true;
    const vector = scoreQuiz(questions, finalAnswers);
    const code = encodeVector(vector);
    const stress = scoreStress(finalAnswers, stressIds);
    writeStress(species, stress);
    localStorage.removeItem(storageKey);
    const search = new URLSearchParams(window.location.search);
    const pair = search.get('pair');
    if (pair && decodeVector(pair)) {
      router.push('/compare?species=' + species + '&a=' + pair + '&b=' + code);
      return;
    }
    // 只有本机完成测试才登记历史；分享链接与双宠对照不会写入
    setPendingResult({
      code,
      vector,
      species,
      testedAt: new Date().toISOString(),
    });
    router.push(resultPath(species, code));
  }

  const isStress = step >= questions.length;
  const progress = Math.round((step / totalSteps) * 100);
  // 显示顺序是原始下标的一份排列；点击时回传原始下标，计分与反向题语义不变
  const displayOrder = order.options[current.id];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-stone-200">
        <div className="h-full bg-amber-700 transition-all" style={{ width: progress + '%' }} />
      </div>
      <p className="mb-2 text-xs font-medium tracking-widest text-stone-400">
        {isStress ? '压力信号' : '第 ' + (step + 1) + ' / ' + questions.length + ' 题'}
      </p>
      <h1 className="mb-8 text-2xl font-bold leading-snug">{current.q}</h1>
      <div className="space-y-3">
        {displayOrder.map((originalIndex) => (
          <button
            key={originalIndex}
            onClick={() => choose(originalIndex)}
            className="w-full rounded-xl border border-stone-200 bg-white px-5 py-4 text-left text-base transition hover:border-amber-700 hover:bg-amber-50"
          >
            {current.options[originalIndex]}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-8 text-sm text-stone-400 underline"
        >
          上一题
        </button>
      )}
    </main>
  );
}
