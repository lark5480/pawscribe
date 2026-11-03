import type {
  Dimension,
  Question,
  SpecialTypeCopy,
  Species,
  StressQuestion,
  TypeCopy,
  TypeTemplate,
  Vector,
} from './types';

import typesData from '../../content/types.json' with { type: 'json' };
import quizData from '../../content/quiz-cat.json' with { type: 'json' };
import copyData from '../../content/copy-cat.json' with { type: 'json' };
import stressData from '../../content/stress-cat.json' with { type: 'json' };
import specialData from '../../content/special-cat.json' with { type: 'json' };
import adviceData from '../../content/compare-advice.json' with { type: 'json' };
import sourceData from '../../content/dimension-sources.json' with { type: 'json' };
import dogQuizData from '../../content/quiz-dog.json' with { type: 'json' };
import dogCopyData from '../../content/copy-dog.json' with { type: 'json' };
import dogStressData from '../../content/stress-dog.json' with { type: 'json' };
import dogSpecialData from '../../content/special-dog.json' with { type: 'json' };
import dogAdviceData from '../../content/compare-advice-dog.json' with { type: 'json' };
import dogAnchorsData from '../../content/dimensions-dog.json' with { type: 'json' };
import dogSourceData from '../../content/dimension-sources-dog.json' with { type: 'json' };

export interface SpeciesData {
  species: Species;
  dimensions: Dimension[];
  questions: Question[];
  typeCopies: TypeCopy[];
  typeTemplates: TypeTemplate[];
  stressQuestions: StressQuestion[];
  stressLevels: Array<{ level: string; label: string; text: string }>;
  specialTypes: { hidden: SpecialTypeCopy; fallback: SpecialTypeCopy };
  // 类型库预览用：隐藏型触发向量（§17.3）
  hiddenVector: Vector;
  compareAdvice: Record<string, { suggestion: string }>;
  dimensionSources: {
    dimensions: Array<{ id: string; source: string; note?: string }>;
    references: Array<{ label: string; detail: string }>;
  };
}

const CAT_TEMPLATES: TypeTemplate[] = typesData.types.map((t: any) => ({
  index: t.index,
  vector: t.vector,
  vectorStr: t.vectorStr,
}));

const CAT_DATA: SpeciesData = {
  species: 'cat',
  dimensions: typesData.dimensions as Dimension[],
  questions: quizData as Question[],
  typeCopies: copyData as TypeCopy[],
  typeTemplates: CAT_TEMPLATES,
  stressQuestions: stressData.questions as StressQuestion[],
  stressLevels: stressData.levels,
  specialTypes: specialData as { hidden: SpecialTypeCopy; fallback: SpecialTypeCopy },
  // 类型库预览用：与 DART 模板距离 1，且仍满足 D4/D5/D6 全 H
  hiddenVector: [0, 1, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  compareAdvice: adviceData as Record<string, { suggestion: string }>,
  dimensionSources: sourceData as SpeciesData['dimensionSources'],
};

// 狗册复用猫册的 15 维 id / 模型 / 维度名，只替换 L/H 两端的行为锚点
const DOG_ANCHOR_MAP: Record<string, { lowDesc: string; highDesc: string }> = {};
for (const d of dogAnchorsData.dimensions) DOG_ANCHOR_MAP[d.id] = d;

const DOG_DIMENSIONS: Dimension[] = typesData.dimensions.map((d: any) => {
  const anchor = DOG_ANCHOR_MAP[d.id];
  return {
    id: d.id,
    model: d.model,
    name: d.name,
    lowDesc: anchor ? anchor.lowDesc : d.lowDesc,
    highDesc: anchor ? anchor.highDesc : d.highDesc,
  };
});

// 狗册 16 型复用猫册的 16 个向量，文案与代码另立
const DOG_DATA: SpeciesData = {
  species: 'dog',
  dimensions: DOG_DIMENSIONS,
  questions: dogQuizData as Question[],
  typeCopies: dogCopyData as TypeCopy[],
  typeTemplates: CAT_TEMPLATES,
  stressQuestions: dogStressData.questions as StressQuestion[],
  stressLevels: dogStressData.levels,
  specialTypes: dogSpecialData as { hidden: SpecialTypeCopy; fallback: SpecialTypeCopy },
  hiddenVector: [0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0],
  compareAdvice: dogAdviceData as Record<string, { suggestion: string }>,
  dimensionSources: dogSourceData as SpeciesData['dimensionSources'],
};

const SPECIES_DATA: Record<Species, SpeciesData | null> = {
  cat: CAT_DATA,
  dog: DOG_DATA,
};

export function getSpeciesData(species: Species): SpeciesData | null {
  return SPECIES_DATA[species] ?? null;
}

export function hasSpeciesData(species: Species): boolean {
  return getSpeciesData(species) !== null;
}

// 保留猫册默认导出，供既有调用方与 CLI 使用
export const DIMENSIONS: Dimension[] = CAT_DATA.dimensions;
export const QUESTIONS: Question[] = CAT_DATA.questions;
export const TYPE_COPIES: TypeCopy[] = CAT_DATA.typeCopies;
export const STRESS_QUESTIONS: StressQuestion[] = CAT_DATA.stressQuestions;
export const STRESS_LEVELS = CAT_DATA.stressLevels;
export const SPECIAL_TYPES = CAT_DATA.specialTypes;
export const TYPE_TEMPLATES: TypeTemplate[] = CAT_DATA.typeTemplates;

export const DIMENSION_MAP: Record<string, Dimension> = {};
for (const d of DIMENSIONS) DIMENSION_MAP[d.id] = d;
