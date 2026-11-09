import type { Metadata } from 'next';

const TITLE = '双宠对照 · 猫狗性格志';
const DESCRIPTION = '猫狗性格志的双宠对照：比较两只猫或两只狗的行为距离，查看同档维度、需要留意与相处同频，以及合作度';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
