import type { Metadata } from 'next';
import { decodeVector } from './codec';
import { matchType } from './matching';
import { resolveTypeCopy } from './result';
import { getSpeciesData } from './data';
import type { Species } from './types';

// 静态社交封面：1200×630，放在 public/og-cover.png
const OG_IMAGE = {
  url: '/og-cover.png',
  width: 1200,
  height: 630,
  alt: '《猫狗性格志》分享封面：暖纸色背景上，左侧为「猫狗性格志」主标题与「30 题，给你的猫或狗一份会随时间变化的性格档案」副标题，右侧圆牌内并排猫与狗的线描图标。',
};

function fallbackMetadata(species: Species): Metadata {
  const ready = getSpeciesData(species) !== null;
  const title = ready ? '结果不存在 · 猫狗性格志' : '狗册准备中 · 猫狗性格志';
  const description = ready
    ? '这个结果链接无效或已过期。可以重新测一次，查看猫或狗的 15 维行为画像。'
    : '狗册内容尚未上线，当前只开放猫册测试。';
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}

// 只按 URL 里的 code 做纯计算，不读写任何服务端状态；物种由路径决定
export function buildResultMetadata(code: string, species: Species): Metadata {
  const data = getSpeciesData(species);
  if (!data) return fallbackMetadata(species);

  const vector = decodeVector(code);
  if (!vector) return fallbackMetadata(species);

  try {
    const match = matchType(vector, data.typeTemplates, data.typeCopies, species);
    const copy = resolveTypeCopy(match, data.typeCopies, data.specialTypes);
    const label = copy.code || copy.label || '';
    const parts = [copy.name];
    if (label) parts.push(label);
    if (species === 'dog') parts.push('狗册');
    parts.push('猫狗性格志');
    const title = parts.join(' · ');
    const description =
      '猫狗性格志：给猫和狗一份会随时间变化的性格档案。' + (copy.hook ? ' ' + copy.hook : copy.note ? ' ' + copy.note : '');
    return {
      title,
      description,
      openGraph: { title, description, type: 'website', images: [OG_IMAGE] },
      twitter: { card: 'summary_large_image', title, description, images: ['/og-cover.png'] },
    };
  } catch {
    return fallbackMetadata(species);
  }
}
