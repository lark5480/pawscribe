'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { decodeVector } from '@/lib/engine/codec';
import type { Species } from '@/lib/engine/types';

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

function isValidCode(value: string): boolean {
  return value.length >= 1 && value.length <= 5 && decodeVector(value) !== null;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm tracking-widest text-stone-800 placeholder:tracking-normal placeholder:text-stone-400 focus:border-amber-700 focus:outline-none';

export default function CompareEntry({
  species,
  ownCode,
}: {
  species: Species;
  ownCode?: string;
}) {
  const [mine, setMine] = useState('');
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const otherCode = normalize(other);
    if (!isValidCode(otherCode)) {
      setError('请输入结果页上的 1–5 位代码');
      return;
    }
    const own = ownCode ? normalize(ownCode) : normalize(mine);
    if (!isValidCode(own)) {
      setError('请输入你自己的结果代码');
      return;
    }
    setError(null);
    window.location.assign('/compare?species=' + species + '&a=' + own + '&b=' + otherCode);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={ownCode ? '' : 'grid gap-3 sm:grid-cols-2'}>
        {!ownCode && (
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">你的结果代码</span>
            <input
              value={mine}
              onChange={(event) => setMine(event.target.value)}
              maxLength={5}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="如 8JJOQ"
              aria-label="你的结果代码"
              className={INPUT_CLASS}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">TA 的结果代码</span>
          <input
            value={other}
            onChange={(event) => setOther(event.target.value)}
            maxLength={5}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="如 8JJOQ"
            aria-label="TA 的结果代码"
            className={INPUT_CLASS}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-amber-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-amber-800"
        >
          开始对照
        </button>
        <span className="text-xs leading-relaxed text-stone-500">
          代码只来自同一册（猫 / 狗）的结果页。
        </span>
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </form>
  );
}
