import type { Metadata } from 'next';
import { getSpeciesData } from '@/lib/engine/data';
import { buildResultMetadata } from '@/lib/engine/metadata';
import SpeciesPreparing from '@/components/domain/SpeciesPreparing';
import ResultView from '@/app/result/[code]/ResultView';

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  return buildResultMetadata(String(params.code || ''), 'dog');
}

// 狗册内容就绪前，任何 /dog/result/* 都返回明确的状态页，不渲染占位结果
export default function DogResultPage({ params }: { params: { code: string } }) {
  if (!getSpeciesData('dog')) return <SpeciesPreparing species="dog" />;
  return <ResultView code={String(params.code || '')} species="dog" />;
}
