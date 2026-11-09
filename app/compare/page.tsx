'use client';

import { useEffect, useState } from 'react';
import { decodeVector } from '@/lib/engine/codec';
import { compareVectors, resolveCompareSpecies, splitShared } from '@/lib/engine/compare';
import type { CompareSpeciesDecision } from '@/lib/engine/compare';
import { getSpeciesData } from '@/lib/engine/data';
import CompareEntry from '@/components/domain/CompareEntry';
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
    return <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-16 text-center text-stone-400">正在读取比较结果…</main>;
  }

  const decision: CompareSpeciesDecision = resolveCompareSpecies(query);
  if (!decision.ok) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-16 text-center">
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

  const querySuffix = species === 'dog' ? '?species=dog' : '';

  const vectorA: Vector | null = query.a ? decodeVector(query.a) : null;
  const vectorB: Vector | null = query.b ? decodeVector(query.b) : null;

  if (!vectorA || !vectorB) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-12">
        <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">← 返回首页</a>
        <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">COMPARE</p>
        <h1 className="mb-3 text-3xl font-bold">两只毛孩的合作度</h1>
        <p className="mb-8 text-sm leading-relaxed text-stone-600">
          输入两份结果的 1–5 位代码。代码在结果页地址末尾，只代表 15 维向量，不含答案与压力分。
        </p>
        <CompareEntry species={species} ownCode={vectorA && query.a ? query.a : undefined} />
        <p className="mt-6 text-xs leading-relaxed text-stone-500">
          结果码不含物种，无法从代码判断是猫册还是狗册；请确认两份代码来自同一册。
        </p>
      </main>
    );
  }

  const result = compareVectors(vectorA, vectorB);
  const split = splitShared(result.conflicts, Object.keys(data.compareAdvice));
  const dimName = (id: string) => data.dimensions.find((d) => d.id === id)?.name ?? id;

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-12">
      <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">← 返回首页</a>
      <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">COMPARE</p>
      <h1 className="mb-6 text-3xl font-bold">两只毛孩的合作度</h1>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <p className="mb-1 text-5xl font-bold text-amber-700">{result.cooperation}%</p>
        <p className="text-sm text-stone-500">15 维距离 {result.distance} / 30</p>
      </div>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-2 text-lg font-bold">同档维度</h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-500">
          双方在同一维都处于 H 档，表示行为强度相近，不等于冲突。
        </p>
        {result.conflicts.length === 0 ? (
          <p className="text-sm text-stone-600">双方没有同处 H 档的维度。</p>
        ) : (
          <div className="space-y-6">
            {split.tension.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-amber-700">需要留意</h3>
                <ul className="space-y-4">
                  {split.tension.map((c) => {
                    const advice = data.compareAdvice[c.dim];
                    return (
                      <li key={c.dim} className="text-sm leading-relaxed text-stone-700">
                        <p className="font-medium">{dimName(c.dim)}（双方均为 H 档）</p>
                        {advice && <p className="mt-1 text-stone-600">{advice.suggestion}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {split.resonance.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-stone-600">相处同频</h3>
                <p className="text-sm leading-relaxed text-stone-600">
                  {split.resonance.map((c) => dimName(c.dim)).join('、')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mb-6 text-sm leading-relaxed text-stone-500">
        合作度由 15 维距离换算；压力信号不参与比较。
        这不是行为诊断。若已经出现打斗或拒食，请咨询兽医或行为专业人士。
      </p>

      <div className="mt-6 flex gap-3">
        <a href={'/compare?species=' + species} className="flex-1 rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">换一组代码</a>
        <a href={'/test' + querySuffix} className="flex-1 rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">测一只新的</a>
      </div>
    </main>
  );
}
