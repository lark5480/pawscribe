// 站点共享 metadata 的唯一权威源，避免散落硬编码。
// 项目没有正式域名（需备案）：只有部署时配置 NEXT_PUBLIC_SITE_URL 才启用 metadataBase；
// 未配置时不设 metadataBase，也不退回任何占位域名，社交分享预览不可用。
export const siteConfig = {
  name: '猫狗性格志',
  description: '45 题，给你的猫或狗一份会随时间变化的性格档案',
  url: process.env.NEXT_PUBLIC_SITE_URL,
  ogImage: {
    url: '/og-cover.png',
    width: 1200,
    height: 630,
    alt: '《猫狗性格志》分享封面：暖纸色背景上，左侧为「猫狗性格志」主标题与「45 题，给你的猫或狗一份会随时间变化的性格档案」副标题，右侧圆牌内并排猫与狗的线描图标。',
  },
} as const;
