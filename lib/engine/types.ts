export type Level = 0 | 1 | 2; // L / M / H
export type Vector = Level[]; // 15 维

// 物种：猫册为默认册，狗册独立题库与锚点
export type Species = 'cat' | 'dog';

export interface Dimension {
  id: string;
  model: string;
  name: string;
  lowDesc: string;
  highDesc: string;
}

export interface Question {
  id: number;
  dim: string;
  reverse: boolean;
  q: string;
  options: [string, string, string];
  // D8 单宠家庭兜底题：该题在无同类接触经验时也可作答（§6.1 设计取舍 3）
  singlePet?: boolean;
}

export interface TypeCopy {
  index: number;
  code: string;
  name: string;
  vector: string;
  hook: string;
  tips: string[];
  breed: string;
}

export interface TypeTemplate {
  index: number;
  vector: Vector;
  vectorStr: string;
}

// 兜底型 / 隐藏型文案：PRD §17.3 只给出名称、钩子与建议，没有 4 字母代码
export interface SpecialTypeCopy {
  label: string;
  name: string;
  note: string;
  hook?: string;
  tips: string[];
}

export interface ResolvedTypeCopy {
  kind: 'normal' | 'hidden' | 'fallback';
  label?: string;
  code?: string;
  name: string;
  hook?: string;
  note?: string;
  tips: string[];
  breed?: string;
}

export interface StressQuestion {
  id: number;
  indicator: string;
  q: string;
  options: [string, string, string];
  scores: [number, number, number];
}

export interface Answers {
  [questionId: number]: number; // 0/1/2（对应选项 A/B/C）
}

export interface MatchResult {
  typeIndex: number;
  code: string;
  name: string;
  similarity: number;
  vector: Vector;
  isFallback: boolean;
  isHidden: boolean;
}
