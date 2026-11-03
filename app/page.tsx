'use client';

import { useEffect, useState } from 'react';
import { hasSpeciesData } from '@/lib/engine/data';
import { historySpeciesPresent, readHistory } from '@/lib/store/history';

export default function Home() {
  const [historyPresence, setHistoryPresence] = useState({ cat: false, dog: false });
  // 狗册内容未上线时不展示狗入口，避免给出一个点进去没有内容的选项
  const dogReady = hasSpeciesData('dog');

  useEffect(() => {
    setHistoryPresence(historySpeciesPresent(readHistory().records));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-sm font-medium tracking-widest text-amber-700">PAWSCRIBE</p>
      <h1 className="mb-4 text-4xl font-bold tracking-tight">猫狗性格志</h1>
      <p className="mb-10 max-w-md text-base leading-relaxed text-stone-600">
        30 题，给你的猫或狗一份会随时间变化的性格档案
      </p>
      <a
        href="/test"
        className="rounded-full bg-amber-700 px-8 py-3 text-base font-medium text-white transition hover:bg-amber-800"
      >
        开始测试
      </a>
      <p className="mt-6 text-xs text-stone-400">30 道题 + 4 道压力信号 · 约 3 分钟 · 结果永久免费</p>
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
        {historyPresence.cat && (
          <a href="/trace" className="text-sm text-amber-700 underline">
            {historyPresence.dog ? '猫册轨迹' : '历史轨迹'}
          </a>
        )}
        {historyPresence.dog && (
          <a href="/trace?species=dog" className="text-sm text-amber-700 underline">
            狗册轨迹
          </a>
        )}
      </div>
    </main>
  );
}
