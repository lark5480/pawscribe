import type { MatchResult, ResolvedTypeCopy, SpecialTypeCopy, TypeCopy } from './types';

// 结果展示：隐藏型优先于兜底型，二者都优先于 16 型文案
export function resolveTypeCopy(
  match: MatchResult,
  copies: TypeCopy[],
  special: { hidden: SpecialTypeCopy; fallback: SpecialTypeCopy },
): ResolvedTypeCopy {
  if (match.isHidden) {
    const c = special.hidden;
    return { kind: 'hidden', label: c.label, name: c.name, note: c.note, hook: c.hook, tips: c.tips };
  }
  if (match.isFallback) {
    const c = special.fallback;
    return { kind: 'fallback', label: c.label, name: c.name, note: c.note, hook: c.hook, tips: c.tips };
  }
  const copy = copies[match.typeIndex];
  return { kind: 'normal', code: copy.code, name: copy.name, hook: copy.hook, tips: copy.tips, breed: copy.breed };
}
