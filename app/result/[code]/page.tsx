import type { Metadata } from 'next';
import { buildResultMetadata } from '@/lib/engine/metadata';
import ResultView from './ResultView';

// 只按 URL 里的 code 做纯计算，不读写任何服务端状态
export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  return buildResultMetadata(String(params.code || ''), 'cat');
}

export default function ResultPage({ params }: { params: { code: string } }) {
  return <ResultView code={String(params.code || '')} species="cat" />;
}
