'use client';

import { useEffect, useState, useRef } from 'react';
import { decodeVector } from '@/lib/engine/codec';
import { matchType } from '@/lib/engine/matching';
import { resolveTypeCopy } from '@/lib/engine/result';
import { getSpeciesData } from '@/lib/engine/data';
import {
  appendHistory,
  createRecordId,
  petIdForSpecies,
  readHistory,
  readStress,
  takePendingResult,
} from '@/lib/store/history';
import RadarChart, { MODEL_COLORS, MODEL_LABELS } from '@/components/domain/RadarChart';
import type { Species } from '@/lib/engine/types';

// 复制链接的兜底：旧浏览器或非安全上下文没有 Clipboard API 时用临时 textarea
function legacyCopy(text: string): boolean {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  return ok;
}

async function copyLink(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {}
  return legacyCopy(url);
}

// 分享卡缩略雷达：只画网格、轴与向量，不画 D1-D15 标签
function drawRadarThumbnail(
  ctx: CanvasRenderingContext2D,
  vector: number[],
  cx: number,
  cy: number,
  radius: number,
) {
  const count = vector.length;
  const pointAt = (index: number, r: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };

  ctx.save();
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  for (const ratio of [1 / 3, 2 / 3, 1]) {
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const p = pointAt(i, radius * ratio);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < count; i++) {
    const p = pointAt(i, radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const p = pointAt(i, radius * (((vector[i] ?? 0) + 1) / 3));
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(180, 83, 9, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < count; i++) {
    const p = pointAt(i, radius * (((vector[i] ?? 0) + 1) / 3));
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#b45309';
    ctx.fill();
  }
  ctx.restore();
}

export default function ResultView({ code, species }: { code: string; species: Species }) {
  const data = getSpeciesData(species);
  const petId = petIdForSpecies(species);
  const [stress, setStress] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vector = decodeVector(code);

  useEffect(() => {
    const s = readStress(species);
    if (s !== null) setStress(s);

    const countForSpecies = (records: { species: string; petId: string }[]) =>
      records.filter((r) => r.species === species && r.petId === petId).length;

    const pending = takePendingResult();
    if (pending && pending.code === code && pending.species === species) {
      const result = appendHistory({
        id: createRecordId(),
        species: pending.species,
        petId,
        code: pending.code,
        vector: pending.vector,
        testedAt: pending.testedAt,
      });
      setHistoryCount(countForSpecies(result.records));
      if (!result.ok) {
        setHistoryNotice('本次结果未能保存到本机历史，可能是隐私模式或存储空间不足。结果页仍可正常查看。');
      }
      return;
    }

    const read = readHistory();
    setHistoryCount(countForSpecies(read.records));
    if (!read.available) {
      setHistoryNotice('本机历史不可用，可能是隐私模式或浏览器限制。');
    } else if (read.degraded) {
      setHistoryNotice('本机历史无法读取，已按空历史处理。');
    }
  }, [code, species, petId]);

  if (!vector || !data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">结果不存在</h1>
        <p className="text-stone-500">链接无效或已过期。</p>
        <a href={'/test' + (species === 'dog' ? '?species=dog' : '')} className="mt-8 inline-block rounded-full bg-amber-700 px-8 py-3 text-white">重新测试</a>
      </main>
    );
  }

  const match = matchType(vector, data.typeTemplates, data.typeCopies, species);
  const copy = resolveTypeCopy(match, data.typeCopies, data.specialTypes);
  const stressLevel = stress !== null && stress >= 50 ? data.stressLevels[1] : data.stressLevels[0];
  const resultBase = species === 'dog' ? '/dog/result/' : '/result/';
  const querySuffix = species === 'dog' ? '?species=dog' : '';

  function drawShareCard() {
    const canvas = canvasRef.current;
    if (!canvas || !vector) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 1200;
    canvas.height = 630;
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('PAWSCRIBE · 猫狗性格志', 60, 80);
    ctx.fillStyle = '#1c1917';
    const nameSize = copy.name.length > 8 ? 64 : copy.name.length > 6 ? 80 : 96;
    ctx.font = 'bold ' + nameSize + 'px sans-serif';
    ctx.fillText(copy.name, 60, 240);
    ctx.fillStyle = '#78716c';
    ctx.font = '36px sans-serif';
    ctx.fillText((copy.code || copy.label || '') + ' · 相似度 ' + match.similarity + '%', 60, 320);
    if (copy.hook) {
      ctx.fillStyle = '#44403c';
      ctx.font = '32px sans-serif';
      wrapText(ctx, copy.hook, 60, 400, 700, 48);
    }
    drawRadarThumbnail(ctx, vector, 930, 300, 140);
    const url = window.location.origin + resultBase + code;
    ctx.fillStyle = '#78716c';
    ctx.font = '22px sans-serif';
    wrapText(ctx, '完整结果：' + url, 60, 570, 1080, 28);
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    let line = '';
    let yy = y;
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth) {
        ctx.fillText(line, x, yy);
        line = ch;
        yy += lineHeight;
      } else {
        line += ch;
      }
    }
    ctx.fillText(line, x, yy);
  }

  function saveCard() {
    drawShareCard();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pawscribe-' + (copy.code || 'special') + '.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // 分享内容只带结果 URL：不含答案、压力分、历史记录
  async function shareLink() {
    const url = window.location.origin + resultBase + code;
    const title = '我家的毛孩是「' + copy.name + '」 · 猫狗性格志';
    const text = '我在猫狗性格志用 30 题给毛孩做了份性格档案，测一测你家毛孩是什么类型。';
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        setShareNotice('分享完成');
        return;
      } catch (err) {
        // 用户取消（AbortError）不提示失败；真实失败则落入复制链接降级
        if ((err as Error).name === 'AbortError') return;
      }
    }
    const ok = await copyLink(url);
    if (ok) {
      setShareNotice('链接已复制，分享给朋友即可在猫狗性格志查看同一个结果');
    } else {
      setShareNotice('复制失败，请长按地址栏手动复制链接');
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <canvas ref={canvasRef} className="hidden" />
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">{copy.code || copy.label}</p>
        <h1 className="mb-3 text-3xl font-bold">{copy.name}</h1>
        {copy.hook && <p className="mb-4 text-lg text-stone-600">{copy.hook}</p>}
        {copy.note && <p className="mb-4 text-sm text-stone-500">{copy.note}</p>}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full bg-amber-700" style={{ width: match.similarity + '%' }} />
          </div>
          <span className="text-sm font-medium text-stone-500">{match.similarity}%</span>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">15 维行为画像</h2>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <RadarChart vector={vector} dimensions={data.dimensions} />
          <div className="w-full space-y-1.5 sm:flex-1">
            {data.dimensions.map((d, i) => (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <span className="w-8 shrink-0 font-medium" style={{ color: MODEL_COLORS[d.model] }}>
                  {d.id}
                </span>
                <span className="flex-1 text-stone-600">{d.name}</span>
                <span className="w-6 text-right font-medium">{['L', 'M', 'H'][vector[i]]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500">
          {Object.entries(MODEL_LABELS).map(([model, label]) => (
            <span key={model} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[model] }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {stress !== null && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
          <h2 className="mb-2 text-lg font-bold">压力信号</h2>
          <p className="mb-3 text-2xl font-bold text-amber-700">{stress} / 100</p>
          <p className="text-sm text-stone-600">{stressLevel.label} —— {stressLevel.text}</p>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">相处建议</h2>
        <ul className="space-y-3">
          {copy.tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-700">
              <span className="shrink-0 font-medium text-amber-700">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {copy.breed && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
          <h2 className="mb-2 text-lg font-bold">品种参考</h2>
          <p className="text-sm text-stone-600">{copy.breed}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={saveCard} className="flex-1 rounded-full bg-amber-700 px-6 py-3 text-center font-medium text-white transition hover:bg-amber-800">
          保存分享卡
        </button>
        <button onClick={shareLink} className="flex-1 rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">
          分享结果
        </button>
      </div>

      {shareNotice && (
        <p className="mt-3 text-center text-xs leading-relaxed text-stone-500">{shareNotice}</p>
      )}

      <a href={'/test?' + (species === 'dog' ? 'species=dog&' : '') + 'pair=' + code} className="mt-3 block rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">
        测我家另一只
      </a>

      <a href={'/library' + querySuffix} className="mt-3 block rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">
        查看类型库
      </a>

      {historyCount >= 2 && (
        <a href={'/trace' + querySuffix} className="mt-3 block rounded-full border border-stone-300 px-6 py-3 text-center font-medium text-stone-700 transition hover:bg-stone-100">
          查看它的轨迹
        </a>
      )}

      {historyNotice && (
        <p className="mt-4 text-center text-xs leading-relaxed text-stone-400">{historyNotice}</p>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-stone-400">
        本测试基于日常行为观察，仅供自我了解与参考，不构成兽医学或动物行为学诊断。
        毛孩的行为会随年龄、健康状况与环境变化，建议定期复测。
        若你或宠物存在紧急风险或健康问题，请及时寻求专业机构与持证人士帮助。
      </p>
    </main>
  );
}
