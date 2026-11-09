import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';
import './globals.css';

// 只有配置了公网域名才启用 metadataBase；未配置时不设，也不退回任何假域名。
const siteUrl = siteConfig.url;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: siteConfig.name,
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: 'website',
    locale: 'zh_CN',
    ...(siteUrl ? { images: [siteConfig.ogImage] } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    ...(siteUrl ? { images: [siteConfig.ogImage.url] } : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-amber-700 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          跳到主要内容
        </a>
        {children}
      </body>
    </html>
  );
}
