import type { Dimension } from '@/lib/engine/types';

export const MODEL_COLORS: Record<string, string> = {
  M1: '#b45309',
  M2: '#0f766e',
  M3: '#1d4ed8',
  M4: '#7e22ce',
  M5: '#be123c',
};

export const MODEL_LABELS: Record<string, string> = {
  M1: 'M1 应激与安定',
  M2: 'M2 活力与探索',
  M3: 'M3 社交',
  M4: 'M4 自主与领地',
  M5: 'M5 情绪与应对',
};

const CENTER = 200;
const RADIUS = 128;
const LABEL_RADIUS = 156;
const RING_RATIOS = [1 / 3, 2 / 3, 1];

function polar(index: number, count: number, radius: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
}

function polygon(points: Array<{ x: number; y: number }>): string {
  return points.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
}

// 15 维雷达：L/M/H 分别落在 1/3、2/3、1 倍半径，轴与点按 5 模型分色
export default function RadarChart({ vector, dimensions }: { vector: number[]; dimensions: Dimension[] }) {
  const count = dimensions.length;
  const valuePoints = dimensions.map((_, i) =>
    polar(i, count, RADIUS * (((vector[i] ?? 0) + 1) / 3)),
  );

  return (
    <svg
      viewBox="0 0 400 400"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label="15 维行为画像雷达图"
    >
      {RING_RATIOS.map((ratio) => (
        <polygon
          key={ratio}
          points={polygon(dimensions.map((_, i) => polar(i, count, RADIUS * ratio)))}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={1}
        />
      ))}
      {dimensions.map((d, i) => {
        const p = polar(i, count, RADIUS);
        return <line key={d.id} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="#e7e5e4" strokeWidth={1} />;
      })}
      <polygon
        points={polygon(valuePoints)}
        fill="rgba(180, 83, 9, 0.15)"
        stroke="#b45309"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {valuePoints.map((p, i) => (
        <circle
          key={dimensions[i].id}
          cx={p.x}
          cy={p.y}
          r={3.5}
          fill={MODEL_COLORS[dimensions[i].model] ?? '#b45309'}
        />
      ))}
      {dimensions.map((d, i) => {
        const p = polar(i, count, LABEL_RADIUS);
        const anchor = p.x > 210 ? 'start' : p.x < 190 ? 'end' : 'middle';
        return (
          <text
            key={d.id}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fill={MODEL_COLORS[d.model] ?? '#78716c'}
          >
            {d.id}
          </text>
        );
      })}
    </svg>
  );
}
