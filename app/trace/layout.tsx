import type { Metadata } from 'next';

const TITLE = '纵向轨迹 · 猫狗性格志';
const DESCRIPTION = '猫狗性格志的纵向轨迹：对比同一只猫或狗的历史结果，查看 15 维变化';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function TraceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
