'use client';

import { useEffect, useState } from 'react';
import { getSpeciesData } from '@/lib/engine/data';
import type { SpeciesData } from '@/lib/engine/data';
import { matchType } from '@/lib/engine/matching';
import { resolveTypeCopy } from '@/lib/engine/result';
import { diffRecords } from '@/lib/engine/trace';
import type { TraceRecord } from '@/lib/engine/trace';
import { clearHistoryForSpecies, readHistory, removeHistoryRecord } from '@/lib/store/history';
import type { HistoryRead } from '@/lib/store/history';
import SpeciesPreparing from '@/components/domain/SpeciesPreparing';
import type { Species } from '@/lib/engine/types';

const LEVEL_LABEL = ['L', 'M', 'H'];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function typeInfo(record: TraceRecord, data: SpeciesData) {
  const match = matchType(record.vector, data.typeTemplates, data.typeCopies, record.species);
  const copy = resolveTypeCopy(match, data.typeCopies, data.specialTypes);
  return { match, copy };
}

export default function TracePage() {
  const [species, setSpecies] = useState<Species | null>(null);
  const [state, setState] = useState<HistoryRead | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search).get('species') === 'dog' ? 'dog' : 'cat';
    setSpecies(sp);
  }, []);

  function reload() {
    const read = readHistory();
    setState(read);
    setBaseId((current) => {
      const latest = read.records.find((r) => r.species === species);
      if (!latest) return null;
      const selected = current ? read.records.find((r) => r.id === current) : undefined;
      if (
        selected &&
        selected.id !== latest.id &&
        selected.petId === latest.petId &&
        selected.species === latest.species
      ) {
        return selected.id;
      }
      const earlier = read.records.find(
        (r) => r.id !== latest.id && r.petId === latest.petId && r.species === latest.species,
      );
      return earlier ? earlier.id : null;
    });
  }

  useEffect(() => {
    if (species) reload();
  }, [species]);

  function handleRemove(id: string) {
    const result = removeHistoryRecord(id);
    if (!result.ok) {
      setNotice('本机历史不可用，删除未生效。');
      return;
    }
    setNotice('已删除 1 条记录。');
    reload();
  }

  function handleClear() {
    if (!species) return;
    const name = species === 'dog' ? '狗册' : '猫册';
    if (typeof window !== 'undefined' && !window.confirm('确定清空' + name + '的全部历史？另一册的记录会保留。此操作不可撤销。')) {
      return;
    }
    const result = clearHistoryForSpecies(species);
    if (!result.ok) {
      setNotice('本机历史不可用，清空未生效。');
      return;
    }
    setNotice('已清空' + name + '历史，另一册记录保留。');
    reload();
  }

  if (!state || !species) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-center text-stone-400">加载中…</main>;
  }

  const data = getSpeciesData(species);
  if (!data) return <SpeciesPreparing species={species} />;

  const testHref = species === 'dog' ? '/test?species=dog' : '/test';
  // 轨迹按物种隔离：猫狗记录不混在同一个列表里
  const records = state.records.filter((r) => r.species === species);
  const latest = records[0];
  const latestInfo = latest ? typeInfo(latest, data) : null;
  const olderRecords = latest
    ? records.filter((r) => r.id !== latest.id && r.petId === latest.petId)
    : [];
  const base = olderRecords.find((r) => r.id === baseId) ?? olderRecords[0];
  const diff = latest && base ? diffRecords(base, latest, data.dimensions.map((d) => d.name)) : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">← 返回首页</a>
      <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">TRACE</p>
      <h1 className="mb-3 text-3xl font-bold">纵向轨迹</h1>

      <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
        历史仅存本机浏览器，不上传、不导出。
      </p>

      {notice && (
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{notice}</p>
      )}

      {!state.available ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <h2 className="mb-3 text-lg font-bold">本机历史不可用</h2>
          <p className="mb-6 text-sm leading-relaxed text-stone-600">
            当前浏览器可能处于隐私模式，或限制了本地存储。你仍可以完成测试并查看结果，但历史不会被保存。
          </p>
          <a href={testHref} className="inline-block rounded-full bg-amber-700 px-8 py-3 text-white">开始测试</a>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <h2 className="mb-3 text-lg font-bold">还没有可对比的记录</h2>
          <p className="mb-6 text-sm leading-relaxed text-stone-600">
            完成一次测试后，这里会保存结果。再测一次才能看到变化。
          </p>
          <a href={testHref} className="inline-block rounded-full bg-amber-700 px-8 py-3 text-white">开始测试</a>
        </div>
      ) : (
        <>
          {latest && latestInfo && (
            <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
              <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">
                {records.length >= 2 ? '本次记录' : '唯一记录'} · {formatDate(latest.testedAt)}
              </p>
              <h2 className="mb-2 text-2xl font-bold">{latestInfo.copy.name}</h2>
              <p className="text-sm text-stone-500">
                {latestInfo.copy.code || latestInfo.copy.label} · 相似度 {latestInfo.match.similarity}%
              </p>
              {latestInfo.copy.hook && (
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{latestInfo.copy.hook}</p>
              )}
            </div>
          )}

          {records.length === 1 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
              <p className="mb-6 text-sm leading-relaxed text-stone-600">再测一次才能看变化。</p>
              <a href={testHref} className="inline-block rounded-full bg-amber-700 px-8 py-3 text-white">再测一次</a>
            </div>
          ) : (
            <>
              {olderRecords.length > 0 && (
                <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6">
                  <label className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                    <span className="font-medium">对比基线</span>
                    <select
                      value={base ? base.id : ''}
                      onChange={(event) => setBaseId(event.target.value)}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                    >
                      {olderRecords.map((r) => (
                        <option key={r.id} value={r.id}>
                          {formatDate(r.testedAt)} · {r.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {diff && (
                <>
                  <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
                    <h2 className="mb-4 text-lg font-bold">变化总结</h2>
                    <ul className="space-y-2">
                      {diff.summary.map((line, i) => (
                        <li key={i} className="text-sm leading-relaxed text-stone-700">{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
                    <h2 className="mb-4 text-lg font-bold">逐维变化</h2>
                    <div className="space-y-2">
                      {data.dimensions.map((d, i) => {
                        const delta = diff.deltas[i];
                        const arrow = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '—';
                        const color = delta.direction === 'up'
                          ? 'text-amber-700'
                          : delta.direction === 'down'
                            ? 'text-stone-500'
                            : 'text-stone-300';
                        return (
                          <div key={d.id} className="flex items-center gap-3">
                            <span className="w-24 shrink-0 text-sm text-stone-500">{d.name}</span>
                            <span className="flex-1 text-sm">
                              {LEVEL_LABEL[delta.from]} → {LEVEL_LABEL[delta.to]}
                            </span>
                            <span className={'w-20 text-right text-sm font-medium ' + color}>
                              {arrow}{delta.crossTwoLevels ? ' 跨两档' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">历史记录</h2>
              <button onClick={handleClear} className="text-xs text-stone-500 underline">清空本册</button>
            </div>
            <ul className="space-y-2">
              {records.map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-stone-500">{formatDate(r.testedAt)}</span>
                  <span className="flex-1 font-medium">{r.code}</span>
                  <button onClick={() => handleRemove(r.id)} className="text-xs text-stone-400 underline">删除</button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-stone-400">
        复测差异只描述变化，不做原因推断。若你对毛孩的行为或健康有疑虑，请咨询兽医或动物行为专业人士。
      </p>
    </main>
  );
}
