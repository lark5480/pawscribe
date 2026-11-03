// 站点唯一权威源：分享卡与 metadata 的绝对地址都从这里取，避免散落硬编码
// 待替换为正式域名
export const siteConfig = {
  name: '猫狗性格志',
  description: '30 题，给你的猫或狗一份会随时间变化的性格档案',
  url: 'https://pawscribe.example.com',
  ogImage: {
    url: '/og-cover.png',
    width: 1200,
    height: 630,
    alt: '《猫狗性格志》分享封面：暖纸色背景上，左侧为「猫狗性格志」主标题与「30 题，给你的猫或狗一份会随时间变化的性格档案」副标题，右侧圆牌内并排猫与狗的线描图标。',
  },
} as const;
