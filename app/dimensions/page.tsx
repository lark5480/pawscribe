import type { Metadata } from 'next';
import { getSpeciesData } from '@/lib/engine/data';
import type { Species } from '@/lib/engine/types';

export function generateMetadata({ searchParams }: { searchParams: { species?: string } }): Metadata {
  const description = '猫狗性格志的 15 个行为学维度：论文出处与翻译说明，猫和狗各自使用独立行为锚点';
  return {
    title: '维度出处 · 猫狗性格志',
    description,
    openGraph: { title: '维度出处 · 猫狗性格志', description, type: 'website' },
    twitter: { card: 'summary', title: '维度出处 · 猫狗性格志', description },
  };
}

const MODEL_NAMES: Record<string, string> = {
  M1: 'M1 应激与安定',
  M2: 'M2 活力与探索',
  M3: 'M3 社交',
  M4: 'M4 自主与领地',
  M5: 'M5 情绪与应对',
};

export default function DimensionsPage({ searchParams }: { searchParams: { species?: string } }) {
  const species: Species = searchParams.species === 'dog' ? 'dog' : 'cat';
  const data = getSpeciesData(species);

  const sourceMap = new Map(data.dimensionSources.dimensions.map((d) => [d.id, d]));

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-12">
      <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">
        ← 返回首页
      </a>
      <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">DIMENSIONS</p>
      <h1 className="mb-4 text-3xl font-bold">维度出处</h1>
      <p className="mb-10 text-base leading-relaxed text-stone-600">
        15 维 = 5 个模型 × 3 个维度，每维对应论文里的一个具体因子或条目，并列出我们这样翻译的理由。
      </p>

      <div className="space-y-8">
        {Object.keys(MODEL_NAMES).map((model) => (
          <section key={model}>
            <h2 className="mb-4 text-lg font-bold">{MODEL_NAMES[model]}</h2>
            <div className="space-y-3">
              {data.dimensions.filter((d) => d.model === model).map((d) => {
                const source = sourceMap.get(d.id);
                return (
                  <article key={d.id} className="rounded-2xl border border-stone-200 bg-white p-6">
                    <div className="mb-2 flex items-baseline gap-3">
                      <span className="text-sm font-medium text-amber-700">{d.id}</span>
                      <h3 className="text-base font-bold">{d.name}</h3>
                    </div>
                    <p className="mb-3 text-sm text-stone-600">
                      {d.lowDesc} ← → {d.highDesc}
                    </p>
                    {source && <p className="text-sm leading-relaxed text-stone-500">出处：{source.source}</p>}
                    {source && source.note && <p className="mt-2 text-sm leading-relaxed text-stone-500">{source.note}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-bold">引用文献</h2>
        <ul className="space-y-3">
          {data.dimensionSources.references.map((r) => (
            <li key={r.label} className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="mb-1 text-sm font-bold">{r.label}</p>
              <p className="text-sm leading-relaxed text-stone-600">{r.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm leading-relaxed text-stone-500">
        本测试基于日常行为观察，仅供自我了解与参考，不构成兽医学或动物行为学诊断。
        毛孩的行为会随年龄、健康状况与环境变化，建议定期复测。
        若你或宠物存在紧急风险或健康问题，请及时寻求专业机构与持证人士帮助。
      </p>
    </main>
  );
}
