import type { Metadata } from 'next';
import { buildResultMetadata } from '@/lib/engine/metadata';
import ResultView from '@/app/result/[code]/ResultView';

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  return buildResultMetadata(String(params.code || ''), 'dog');
}

export default function DogResultPage({ params }: { params: { code: string } }) {
  return <ResultView code={String(params.code || '')} species="dog" />;
}
