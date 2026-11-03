'use client';

import { useEffect, useState } from 'react';
import { decodeVector } from '@/lib/engine/codec';
import { compareVectors, resolveCompareSpecies } from '@/lib/engine/compare';
import type { CompareResult, CompareSpeciesDecision } from '@/lib/engine/compare';
import { getSpeciesData } from '@/lib/engine/data';
import SpeciesPreparing from '@/components/domain/SpeciesPreparing';
import type { Species, Vector } from '@/lib/engine/types';

interface CompareQuery {
  a: string | null;
  b: string | null;
  species: string | null;
  speciesA: string | null;
  speciesB: string | null;
}

export default function ComparePage() {
  const [query, setQuery] = useState<CompareQuery | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setQuery({
      a: search.get('a'),
      b: search.get('b'),
      species: search.get('species'),
      speciesA: search.get('speciesA'),
      speciesB: search.get('speciesB'),
    });
  }, []);

  if (!query) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-center text-stone-400">正在读取比较结果…</main>;
  }

  const decision: CompareSpeciesDecision = resolveCompareSpecies(query);
  if (!decision.ok) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">跨物种不能做维度距离对照</h1>
        <p className="mb-3 text-stone-600">
          猫与狗的行为锚点、题库各自独立，15 维向量不在同一测量尺度上。用维度距离换算「合作度」会得到一个看似精确、实际无意义的数字，所以我们不计算。
        </p>
        <p className="mb-8 text-sm leading-relaxed text-stone-500">
          如果两只毛孩物种不同，建议分别查看各自的结果，用行为描述对照；目前不提供跨物种合作度。
        </p>
        <div className="flex flex-col gap-3">
          {query.a && <a href={(decision.speciesA === 'dog' ? '/dog/result/' : '/result/') + query.a} className="text-amber-700 underline">查看第一只的结果</a>}
          {query.b && <a href={(decision.speciesB === 'dog' ? '/dog/result/' : '/result/') + query.b} className="text-amber-700 underline">查看第二只的结果</a>}
          <a href="/test" className="rounded-full bg-amber-700 px-8 py-3 text-white">重新测试</a>
          <a href="/" className="text-sm text-stone-500 underline">返回首页</a>
        </div>
      </main>
    );
  }

  const species: Species = decision.species;
  const data = getSpeciesData(species);
  if (!data) return <SpeciesPreparing species={species} />;

  const resultBase = species === 'dog' ? '/dog/result/' : '/result/';
  const querySuffix = species === 'dog' ? '?species=dog' : '';

  const vectorA: Vector | null = query.a ? decodeVector(query.a) : null;
  const vectorB: Vector | null = query.b ? decodeVector(query.b) : null;
  let result: CompareResult | null = null;
  if (vectorA && vectorB) {
    try {
      result = compareVectors(vectorA, vectorB);
    } catch {
      result = null;
    }
  }

  if (!result) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">无法比较这两份结果</h1>
        <p className="mb-6 text-stone-500">比较链接缺少 a / b，或结果编码无效。</p>
        <div className="flex flex-col gap-3">
          {vectorA && query.a && <a href={resultBase + query.a} className="text-amber-700 underline">查看第一只的结果</a>}
          {vectorB && query.b && <a href={resultBase + query.b} className="text-amber-700 underline">查看第二只的结果</a>}
          <a href={'/test' + querySuffix} className="rounded-full bg-amber-700 px-8 py-3 text-white">重新测试</a>
          <a href="/" className="text-sm text-stone-500 underline">返回首页</a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">← 返回首页</a>
      <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">COMPARE</p>
      <h1 className="mb-6 text-3xl font-bold">两只毛孩的合作度</h1>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <p className="mb-1 text-5xl font-bold text-amber-700">{result.cooperation}%</p>
        <p className="text-sm text-stone-500">15 维距离 {result.distance} / 30</p>
      </div>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">冲突维度</h2>
        {result.conflicts.length === 0 ? (
          <p className="text-sm text-stone-600">双方没有同时处于 H 档的维度。</p>
        ) : (
          <ul className="space-y-4">
            {result.conflicts.map((c) => {
              const name = data.dimensions.find((d) => d.id === c.dim)?.name ?? c.dim;
              const advice = data.compareAdvice[c.dim];
              return (
                <li key={c.dim} className="text-sm leading-relaxed text-stone-700">
                  <p className="font-medium">{name}（双方均为 H 档）</p>
                  {advice && <p className="mt-1 text-stone-600">{advice.suggestion}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mb-6 text-sm leading-relaxed text-stone-500">
        合作度由 15 维距离换算；压力信号不参与比较。
        这不是行为诊断。若已经出现打斗或拒食，请咨询兽医或行为专业人士。
      </p>

      <div className="flex gap-3">
        <a href={'/test' + querySuffix} className="flex-1 rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">测一只新的</a>
      </div>
    </main>
  );
}
