import type { Metadata } from 'next';
import { getSpeciesData } from '@/lib/engine/data';
import { encodeVector } from '@/lib/engine/codec';
import SpeciesPreparing from '@/components/domain/SpeciesPreparing';
import type { Species } from '@/lib/engine/types';

export function generateMetadata({ searchParams }: { searchParams: { species?: string } }): Metadata {
  const species: Species = searchParams.species === 'dog' ? 'dog' : 'cat';
  const data = getSpeciesData(species);
  if (!data) {
    return {
      title: '狗册准备中 · 猫狗性格志',
      description: '狗册内容尚未上线，当前只开放猫册测试。',
      robots: { index: false, follow: false },
    };
  }
  const name = species === 'dog' ? '狗格' : '猫格';
  const description = '猫狗性格志的类型库：给猫和狗各 16 型档案（' + name + '），以及隐藏型与兜底型的触发说明';
  return {
    title: '类型库 · 猫狗性格志',
    description,
    openGraph: { title: '类型库 · 猫狗性格志', description, type: 'website' },
    twitter: { card: 'summary', title: '类型库 · 猫狗性格志', description },
  };
}

export default function LibraryPage({ searchParams }: { searchParams: { species?: string } }) {
  const species: Species = searchParams.species === 'dog' ? 'dog' : 'cat';
  const data = getSpeciesData(species);
  if (!data) return <SpeciesPreparing species={species} />;

  const querySuffix = species === 'dog' ? '?species=dog' : '';
  const resultBase = species === 'dog' ? '/dog/result/' : '/result/';
  const normalTypes = data.typeCopies.map((copy) => {
    const template = data.typeTemplates.find((t) => t.index === copy.index);
    return {
      copy,
      href: template ? resultBase + encodeVector(template.vector) : null,
    };
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">
        ← 返回首页
      </a>
      <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">LIBRARY</p>
      <h1 className="mb-4 text-3xl font-bold">类型库</h1>
      <p className="mb-10 text-base leading-relaxed text-stone-600">
        16 型由 15 维向量在候选空间中均匀分布生成。每型包含 4 字母代码、中文名与一句可对照的钩子，点开可查看该型的完整结果页。
      </p>

      <section>
        <h2 className="mb-4 text-lg font-bold">16 型</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {normalTypes.map(({ copy, href }) => {
            const card = (
              <>
                <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">{copy.code}</p>
                <h3 className="mb-2 text-lg font-bold break-words">{copy.name}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{copy.hook}</p>
              </>
            );
            if (!href) {
              return (
                <div key={copy.code} className="rounded-2xl border border-stone-200 bg-white p-6">
                  {card}
                </div>
              );
            }
            return (
              <a
                key={copy.code}
                href={href}
                className="block rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-amber-700"
              >
                {card}
              </a>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-bold">特殊型</h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-500">
          隐藏型由行为规则触发，兜底型在相似度低于 60% 时触发。两者都不属于 16 型模板，不生成 4 字母代码，以「隐藏型」「兜底型」标签呈现。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={resultBase + encodeVector(data.hiddenVector)}
            className="block rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-amber-700"
          >
            <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">{data.specialTypes.hidden.label}</p>
            <h3 className="mb-2 text-lg font-bold break-words">{data.specialTypes.hidden.name}</h3>
            {data.specialTypes.hidden.hook && (
              <p className="mb-2 text-sm leading-relaxed text-stone-600">{data.specialTypes.hidden.hook}</p>
            )}
            <p className="text-sm leading-relaxed text-stone-500">{data.specialTypes.hidden.note}</p>
          </a>
          <a
            href="#fallback-explain"
            className="block rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-amber-700"
          >
            <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">{data.specialTypes.fallback.label}</p>
            <h3 className="mb-2 text-lg font-bold break-words">{data.specialTypes.fallback.name}</h3>
            <p className="mb-2 text-sm leading-relaxed text-stone-600">{data.specialTypes.fallback.note}</p>
            <p className="text-sm leading-relaxed text-stone-500">触发条件：与该次测试匹配到的类型相似度低于 60%。</p>
          </a>
        </div>
      </section>

      <section id="fallback-explain" className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-bold">兜底型说明</h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-600">
          兜底型没有固定的结果 URL：它取决于当次测试的 15 维向量。相似度低于 60% 时，结果页会以「兜底型」标签展示下面的建议。
        </p>
        <ul className="space-y-2">
          {data.specialTypes.fallback.tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-700">
              <span className="shrink-0 font-medium text-amber-700">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex gap-5">
        <a href={'/test' + querySuffix} className="text-sm text-stone-500 underline">
          测一只毛孩
        </a>
        <a href={'/dimensions' + querySuffix} className="text-sm text-stone-500 underline">
          查看 15 维出处
        </a>
      </div>
    </main>
  );
}
