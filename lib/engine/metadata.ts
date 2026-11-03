import type { Metadata } from 'next';
import { decodeVector } from './codec';
import { matchType } from './matching';
import { resolveTypeCopy } from './result';
import { getSpeciesData } from './data';
import type { Species } from './types';

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
      openGraph: { title, description, type: 'website' },
      twitter: { card: 'summary', title, description },
    };
  } catch {
    return fallbackMetadata(species);
  }
}
