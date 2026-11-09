'use client';

import { useEffect, useState } from 'react';
import { getSpeciesData, hasSpeciesData } from '@/lib/engine/data';
import { encodeVector } from '@/lib/engine/codec';
import { matchType } from '@/lib/engine/matching';
import { resolveTypeCopy } from '@/lib/engine/result';
import { recencyLabel } from '@/lib/engine/time';
import { readHistory } from '@/lib/store/history';
import RadarChart from '@/components/domain/RadarChart';
import CompareEntry from '@/components/domain/CompareEntry';
import type { Species } from '@/lib/engine/types';

const CAT_DATA = getSpeciesData('cat');
const SAMPLE_COPY = CAT_DATA?.typeCopies.find((copy) => copy.code === 'DART');
const SAMPLE_TEMPLATE = CAT_DATA?.typeTemplates.find((template) => template.index === SAMPLE_COPY?.index);
const SAMPLE_LINK =
  SAMPLE_COPY && SAMPLE_TEMPLATE
    ? { name: SAMPLE_COPY.name, href: '/result/' + encodeVector(SAMPLE_TEMPLATE.vector) }
    : null;

interface ArchiveItem {
  species: Species;
  label: string;
  name: string;
  code: string;
  recency: string;
  resultHref: string;
  traceHref: string;
  retestHref: string;
}

function archiveFor(records: ReturnType<typeof readHistory>['records'], species: Species): ArchiveItem | null {
  const data = getSpeciesData(species);
  if (!data) return null;
  const own = records.filter((record) => record.species === species);
  if (own.length === 0) return null;
  const latest = own.reduce((a, b) => (Date.parse(b.testedAt) > Date.parse(a.testedAt) ? b : a));
  const recency = recencyLabel(latest.testedAt);
  if (!recency) return null;
  const match = matchType(latest.vector, data.typeTemplates, data.typeCopies, species);
  const copy = resolveTypeCopy(match, data.typeCopies, data.specialTypes);
  return {
    species,
    label: species === 'dog' ? '狗册' : '猫册',
    name: copy.name,
    code: latest.code,
    recency,
    resultHref: (species === 'dog' ? '/dog/result/' : '/result/') + latest.code,
    traceHref: species === 'dog' ? '/trace?species=dog' : '/trace',
    retestHref: species === 'dog' ? '/test?species=dog' : '/test',
  };
}

export default function Home() {
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [compareChoice, setCompareChoice] = useState<Species | null>(null);
  const dogReady = hasSpeciesData('dog');

  useEffect(() => {
    const { records } = readHistory();
    setArchives(
      [archiveFor(records, 'cat'), archiveFor(records, 'dog')].filter(
        (item): item is ArchiveItem => item !== null,
      ),
    );
  }, []);

  const hasCatArchive = archives.some((item) => item.species === 'cat');
  const hasDogArchive = archives.some((item) => item.species === 'dog');
  const compareSpecies: Species = compareChoice ?? (!hasCatArchive && hasDogArchive ? 'dog' : 'cat');

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium tracking-[0.2em] text-amber-700">PAWSCRIBE</span>
        <nav className="flex gap-5 text-sm text-stone-500">
          <a href="/library" className="hover:text-stone-900">类型库</a>
          <a href="/dimensions" className="hover:text-stone-900">15 维出处</a>
          <a href="/about" className="hover:text-stone-900">关于</a>
        </nav>
      </header>

      <section className="mt-12 sm:mt-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">猫狗性格志</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
          45 题，给你的猫或狗一份会随时间变化的性格档案。两只合不合得来，它这半年变了没有，都能算。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/test"
            className="rounded-full bg-amber-700 px-8 py-3 text-base font-medium text-white transition hover:bg-amber-800"
          >
            开始测猫
          </a>
          {dogReady && (
            <a
              href="/test?species=dog"
              className="rounded-full border border-stone-300 px-8 py-3 text-base font-medium text-stone-700 transition hover:bg-stone-100"
            >
              测狗
            </a>
          )}
        </div>
        <p className="mt-4 text-xs text-stone-400">45 道题 + 4 道压力信号 · 约 4 分钟 · 结果永久免费</p>
      </section>

      {archives.length > 0 && (
        <section className="mt-12 border-t border-stone-200 pt-6">
          <p className="text-xs tracking-widest text-stone-400">你的档案</p>
          <ul className="mt-4 space-y-4">
            {archives.map((item) => (
              <li key={item.species} className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{item.name}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {item.label} · {item.code} · 最近一次 {item.recency}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <a href={item.resultHref} className="text-amber-700 underline">看档案</a>
                  <a href={item.traceHref} className="text-stone-500 underline">轨迹</a>
                  <a href={item.retestHref} className="text-stone-500 underline">再测</a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {SAMPLE_COPY && SAMPLE_TEMPLATE && SAMPLE_LINK && CAT_DATA && (
        <section className="mt-12 border-t border-stone-200 pt-8">
          <p className="text-xs tracking-widest text-stone-400">样例档案</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
            <div className="flex justify-center sm:justify-start">
              <RadarChart vector={SAMPLE_TEMPLATE.vector} dimensions={CAT_DATA.dimensions} />
            </div>
            <div>
              <p className="text-sm tracking-widest text-amber-700">{SAMPLE_COPY.code}</p>
              <h2 className="mt-1 text-2xl font-bold">{SAMPLE_COPY.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{SAMPLE_COPY.hook}</p>
              <a href={SAMPLE_LINK.href} className="mt-4 inline-block text-sm text-amber-700 underline">
                看完整档案 →
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="mt-12 border-t border-stone-200 pt-8">
        <p className="text-xs tracking-widest text-stone-400">两只毛孩</p>
        <h2 className="mt-2 text-2xl font-bold">它们能不能处得来</h2>
        <p className="mb-5 mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
          输入两份结果的 1–5 位代码，按 15 维行为距离算合作度，并列出双方同处 H 档的维度。跨物种不计算。
        </p>
        <div className="mb-4 inline-flex rounded-full border border-stone-300 p-1 text-xs">
          <button
            onClick={() => setCompareChoice('cat')}
            className={
              'rounded-full px-3 py-1 transition ' +
              (compareSpecies === 'cat' ? 'bg-amber-700 text-white' : 'text-stone-500 hover:text-stone-900')
            }
          >
            猫册
          </button>
          <button
            onClick={() => setCompareChoice('dog')}
            disabled={!dogReady}
            className={
              'rounded-full px-3 py-1 transition disabled:opacity-40 ' +
              (compareSpecies === 'dog' ? 'bg-amber-700 text-white' : 'text-stone-500 hover:text-stone-900')
            }
          >
            狗册
          </button>
        </div>
        <CompareEntry key={compareSpecies} species={compareSpecies} />
      </section>

      {CAT_DATA && (
        <section className="mt-12 border-t border-stone-200 pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">16 型</h2>
            <a href="/library" className="text-sm text-stone-500 underline">类型库</a>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {CAT_DATA.typeCopies.map((copy) => (
              <li key={copy.code}>
                <a href={'/library#' + copy.code} className="group block">
                  <span className="text-xs tracking-widest text-amber-700">{copy.code}</span>
                  <span className="mt-0.5 block text-sm text-stone-700 group-hover:text-amber-700">
                    {copy.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-500">狗册复用同一套 16 型向量，名称与建议另立。</p>
        </section>
      )}

      <footer className="mt-12 border-t border-stone-200 pt-6 text-xs leading-relaxed text-stone-400">
        <p>本测试基于日常行为观察，仅供自我了解与参考，不构成兽医学或动物行为学诊断。</p>
        <p className="mt-1">毛孩的行为会随年龄、健康状况与环境变化，建议定期复测。</p>
        <p className="mt-1">若你或宠物存在紧急风险或健康问题，请及时寻求专业机构与持证人士帮助。</p>
      </footer>
    </main>
  );
}
