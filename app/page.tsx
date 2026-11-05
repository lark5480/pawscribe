'use client';

import { useEffect, useState } from 'react';
import { getSpeciesData, hasSpeciesData } from '@/lib/engine/data';
import { encodeVector } from '@/lib/engine/codec';
import { latestRecency } from '@/lib/engine/time';
import { readHistory } from '@/lib/store/history';

const CAT_DATA = getSpeciesData('cat');
const SAMPLE_COPY = CAT_DATA?.typeCopies.find((copy) => copy.code === 'DART');
const SAMPLE_TEMPLATE = CAT_DATA?.typeTemplates.find((template) => template.index === SAMPLE_COPY?.index);
const SAMPLE_LINK =
  SAMPLE_COPY && SAMPLE_TEMPLATE
    ? { name: SAMPLE_COPY.name, href: '/result/' + encodeVector(SAMPLE_TEMPLATE.vector) }
    : null;

export default function Home() {
  const [historyRecency, setHistoryRecency] = useState<{ cat: string | null; dog: string | null }>({
    cat: null,
    dog: null,
  });
  // 狗册内容未上线时不展示狗入口，避免给出一个点进去没有内容的选项
  const dogReady = hasSpeciesData('dog');

  useEffect(() => {
    const { records } = readHistory();
    setHistoryRecency({
      cat: latestRecency(records, 'cat'),
      dog: latestRecency(records, 'dog'),
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-sm font-medium tracking-widest text-amber-700">PAWSCRIBE</p>
      <h1 className="mb-4 text-4xl font-bold tracking-tight">猫狗性格志</h1>
      <p className="mb-10 max-w-md text-base leading-relaxed text-stone-600">
        45 题，给你的猫或狗一份会随时间变化的性格档案
      </p>
      <a
        href="/test"
        className="rounded-full bg-amber-700 px-8 py-3 text-base font-medium text-white transition hover:bg-amber-800"
      >
        开始测试
      </a>
      <p className="mt-6 text-xs text-stone-400">45 道题 + 4 道压力信号 · 约 4 分钟 · 结果永久免费</p>
      {SAMPLE_LINK && (
        <a href={SAMPLE_LINK.href} className="mt-4 text-sm text-stone-500 underline">
          先看一份样例档案：{SAMPLE_LINK.name}
        </a>
      )}
      {dogReady && (
        <a href="/test?species=dog" className="mt-4 text-sm text-stone-500 underline">
          狗册测试
        </a>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <a href="/dimensions" className="text-sm text-stone-500 underline">
          查看 15 维出处
        </a>
        <a href="/library" className="text-sm text-stone-500 underline">
          类型库
        </a>
        <a href="/about" className="text-sm text-stone-500 underline">
          关于与隐私
        </a>
        {historyRecency.cat && (
          <a href="/trace" className="text-sm text-amber-700 underline">
            {historyRecency.dog ? '猫册轨迹' : '历史轨迹'} · {historyRecency.cat}
          </a>
        )}
        {historyRecency.dog && (
          <a href="/trace?species=dog" className="text-sm text-amber-700 underline">
            狗册轨迹 · {historyRecency.dog}
          </a>
        )}
      </div>
    </main>
  );
}
