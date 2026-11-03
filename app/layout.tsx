import type { Metadata } from 'next';
import './globals.css';

const SITE_NAME = '猫狗性格志';
const SITE_DESCRIPTION = '30 题，给你的猫或狗一份会随时间变化的性格档案';
const OG_IMAGE = {
  url: '/og-cover.png',
  width: 1200,
  height: 630,
  alt: '《猫狗性格志》分享封面：暖纸色背景上，左侧为「猫狗性格志」主标题与「30 题，给你的猫或狗一份会随时间变化的性格档案」副标题，右侧圆牌内并排猫与狗的线描图标。',
};

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'zh_CN',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og-cover.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
