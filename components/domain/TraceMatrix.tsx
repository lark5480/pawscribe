import { Fragment } from 'react';
import { MODEL_COLORS } from './RadarChart';
import type { Dimension } from '@/lib/engine/types';
import type { TraceRecord } from '@/lib/engine/trace';

const LEVEL_LABEL = ['L', 'M', 'H'];
const LEVEL_OPACITY = [0.16, 0.48, 1];

function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

// 15 维 × 多次记录的色块矩阵；records 按时间从旧到新传入
export default function TraceMatrix({
  records,
  dimensions,
}: {
  records: TraceRecord[];
  dimensions: Dimension[];
}) {
  if (records.length === 0) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[320px] items-center gap-y-1.5"
          style={{ gridTemplateColumns: '7.5rem repeat(' + records.length + ', minmax(1.75rem, 1fr))' }}
        >
          <div />
          {records.map((record) => (
            <div key={record.id} className="text-center text-[10px] text-stone-400">
              {shortDate(record.testedAt)}
            </div>
          ))}
          {dimensions.map((dimension, index) => (
            <Fragment key={dimension.id}>
              <div className="whitespace-nowrap pr-2 text-xs text-stone-500">
                {dimension.id} {dimension.name}
              </div>
              {records.map((record) => {
                const level = record.vector[index];
                const label = LEVEL_LABEL[level] ?? '—';
                return (
                  <div
                    key={record.id}
                    className="h-5 rounded-sm"
                    style={{
                      backgroundColor: MODEL_COLORS[dimension.model] ?? '#b45309',
                      opacity: LEVEL_OPACITY[level] ?? 0.16,
                    }}
                    title={dimension.id + ' ' + dimension.name + ' · ' + shortDate(record.testedAt) + ' · ' + label}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-stone-500">
        {LEVEL_LABEL.map((label, level) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm bg-amber-700"
              style={{ opacity: LEVEL_OPACITY[level] }}
            />
            {label}
          </span>
        ))}
        <span>从左到右由旧到新</span>
      </div>

      <ul className="sr-only">
        {dimensions.map((dimension, index) => (
          <li key={dimension.id}>
            {dimension.id} {dimension.name}：
            {records.map((record) => LEVEL_LABEL[record.vector[index]] ?? '—').join(' → ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
