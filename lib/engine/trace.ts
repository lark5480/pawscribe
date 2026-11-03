import type { Level, Vector } from './types';

export interface TraceRecord {
  id: string;
  species: 'cat' | 'dog';
  petId: string;
  petLabel?: string;
  code: string;
  vector: Vector;
  testedAt: string;
}

export type TraceDirection = 'up' | 'down' | 'same';

export interface DimDelta {
  dim: string;
  from: Level;
  to: Level;
  delta: number;
  direction: TraceDirection;
  crossTwoLevels: boolean;
}

export interface TraceDiff {
  deltas: DimDelta[];
  changedCount: number;
  summary: string[];
}

const LEVEL_LABEL = ['L', 'M', 'H'];

function assertRecord(record: TraceRecord, label: string): void {
  if (!record || typeof record !== 'object') {
    throw new Error(label + ' 非法：缺少记录');
  }
  if (!Array.isArray(record.vector) || record.vector.length !== 15) {
    throw new Error(label + ' 非法：应为 15 维向量');
  }
  for (const v of record.vector) {
    if (!Number.isInteger(v) || v < 0 || v > 2) {
      throw new Error(label + ' 非法：每一维只能是 0/1/2');
    }
  }
  if (typeof record.testedAt !== 'string' || Number.isNaN(Date.parse(record.testedAt))) {
    throw new Error(label + ' 非法：testedAt 应为可解析的时间');
  }
}

// 只对比同一只宠物；压力分不在记录与输入内
export function diffRecords(base: TraceRecord, latest: TraceRecord, dimNames: string[]): TraceDiff {
  assertRecord(base, '基线记录');
  assertRecord(latest, '当前记录');
  if (base.species !== latest.species || base.petId !== latest.petId) {
    throw new Error('只能对比同一只宠物的记录');
  }

  const deltas: DimDelta[] = [];
  for (let i = 0; i < 15; i++) {
    const from = base.vector[i] as Level;
    const to = latest.vector[i] as Level;
    const delta = to - from;
    deltas.push({
      dim: 'D' + (i + 1),
      from,
      to,
      delta,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same',
      crossTwoLevels: Math.abs(delta) === 2,
    });
  }

  const changed = deltas
    .filter((d) => d.direction !== 'same')
    .sort((a, b) => {
      const magnitude = Math.abs(b.delta) - Math.abs(a.delta);
      if (magnitude !== 0) return magnitude;
      return Number(a.dim.slice(1)) - Number(b.dim.slice(1));
    });

  const summary = changed.slice(0, 3).map((d) => {
    const name = dimNames[Number(d.dim.slice(1)) - 1] || d.dim;
    const verb = d.direction === 'up' ? '升到' : '降到';
    return name + '从 ' + LEVEL_LABEL[d.from] + ' ' + verb + ' ' + LEVEL_LABEL[d.to] +
      (d.crossTwoLevels ? '（跨两档）' : '');
  });

  if (summary.length === 0) {
    summary.push('和上次相比没有变化');
  }

  return { deltas, changedCount: changed.length, summary };
}
