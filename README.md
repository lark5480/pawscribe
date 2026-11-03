# pawscribe · 猫狗性格志

**45 题，给你的猫或狗一份会随时间变化的性格档案。**

`Next.js 14` · `React 18` · `TypeScript` · `Tailwind 3` · `EdgeOne Makers`

---

## 快速开始

```bash
npm install
npm run dev        # 本地开发 :3000
npm test           # 引擎 + 内容单测
npm run typecheck
npm run build
npm run cli:validate   # 猫狗两册内容校验
```

> 仓库没有 ESLint 配置，**不存在可用的 `npm run lint`**；`package.json` 里的 lint 脚本无法完成校验。提交前用 `typecheck` + `cli:validate` + `test` + `build` 自检；e2e 需先 build，再跑 `npm run test:e2e`。

## 本地运行与临时分享

只想本地看或开发时，**隧道不是必需品**：克隆仓库后执行 `npm install` + `npm run dev`，打开 `http://localhost:3000` 即可。

需要把链接发给外部朋友时：

1. 首次使用先运行 `download-cloudflared.bat`：把 cloudflared 下载到 `tools/cloudflared.exe`（约 53 MB，只需一次，该二进制不入库）。
2. 之后双击 `start-tunnel.bat`：它会复用已在运行的 `:3000` 服务（没有就自己起一个），打印形如 `https://xxx.trycloudflare.com` 的地址并复制到剪贴板。

`start-tunnel.bat` 启动 `:3000` 服务时**默认走生产构建**：已有 `.next` 就直接 `npx next start -p 3000`，没有则先执行 `npm run build` 再启动，构建失败会停下且不建立隧道。生产构建的首屏资源远小于 dev 模式，朋友在微信里打开更快；需要热更新调试时请自己手写 `npm run dev`（同一时间只跑其中一种，二者会争用 `.next`）。

隧道是临时的：关掉窗口即断，每次运行都会换一个新地址。长期分享请走部署，步骤见 [`AGENTS.md`](AGENTS.md) 的「部署」章节（EdgeOne Makers，构建 `npm run build`，输出 `.next`）。

## 分享卡怎么保存

结果页点「保存分享卡」后，卡片会以图片直接显示在页面上：在微信内置浏览器里**长按图片保存或转发**（微信会拦截网页触发的下载）；桌面浏览器可再点「下载到本地」把 PNG 存到磁盘。

## 可用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发 `:3000` |
| `npm run build` | 生产构建，输出 `.next` |
| `npm run start` | 启动生产构建 |
| `npm test` | 运行 `cli/src/engine.test.ts` |
| `npm run test:e2e` | 运行 Playwright Chromium 冒烟（需先 `npm run build`） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run cli:validate` | 校验猫册、狗册全部内容资产与禁用词 |
| `npm run cli:types` | 生成 16 型向量，输出到 stdout（可重定向到 `content/types-raw.json`） |
| `npm run cli:quiz` / `npm run cli:quiz:dog` | 生成/校验猫册、狗册 45 题 |
| `npm run cli:copy` / `npm run cli:copy:dog` | 生成/校验猫册、狗册 16 型文案 |
| `npm run cli:stress` / `npm run cli:stress:dog` | 生成/校验猫册、狗册压力题 |
| `npm run cli:advice:dog` | 生成/校验狗册比较建议 |

## 路由

| 路由 | 说明 |
|---|---|
| `/` | 首页：猫册 / 狗册测试入口、类型库、维度、按物种显示的轨迹入口 |
| `/test` | 猫册测试；`/test?species=dog` 进入狗册测试 |
| `/result/[code]` | 猫册结果页，含 `generateMetadata` |
| `/dog/result/[code]` | 狗册结果页，含 `generateMetadata` |
| `/library` | 类型库；`?species=dog` 显示狗册 16 型 |
| `/dimensions` | 15 维锚点与出处；`?species=dog` 显示狗册锚点 |
| `/about` | 方法论、数据与隐私、免责声明 |
| `/trace` | 纵向轨迹；`?species=dog` 只看狗册记录 |
| `/compare` | 双宠对照；`?species=dog&a=<code>&b=<code>`，同一物种才计算 |

项目**没有 API 路由**。计分、匹配、编码与 metadata 都是纯函数；答案、结果与历史只存浏览器。

## 猫册与狗册的边界

- 两册共用 15 维、计分、匹配、base36 编码与 16 型向量。
- 45 题、15 维 L/H 锚点、16 型代码 / 名称 / 钩子 / 建议 / 品种参考、4 道压力题与两档文案、比较建议，均按物种各存一份。
- 物种由入口决定：`/test` 默认猫册，`/test?species=dog` 走狗册；结果路径分别为 `/result/<code>` 与 `/dog/result/<code>`。
- 本机状态按物种隔离：进度 `pawscribe-progress-v3` / `pawscribe-progress-v3:dog`；压力分 `pawscribe-stress:cat` / `pawscribe-stress:dog`；历史按 `species + petId` 计数（`cat-default` / `dog-default`），每个组合最多 20 条，猫狗互不挤占。
- 身份模型为 v1.1 单宠单档案；历史只存当前浏览器，不上传、不导出。

## 目录结构

```
app/                 页面（App Router，无 API 路由）
components/domain/   跨页共享组件
lib/engine/          纯函数：计分、匹配、编码、校验、metadata
lib/store/           localStorage 历史与 sessionStorage 压力分
cli/src/             内容生成与校验脚本
content/             猫册 / 狗册 JSON 内容
docs/                PRD 与调研快照
```

页面内状态直接由 React 管理（如 `app/test/TestFlow.tsx`）；仓库中没有 `hooks/`、`types/`、`components/ui|quiz|result` 目录。

## 内容校验

`npm run cli:validate` 同时校验猫册与狗册，覆盖结构合同、禁用词、诊断词、猫册专属词与文献字段。

禁用词按词级判定：`最好 / 最棒 / 第一名 / 绝对 / 一定 / 治愈` 会被拦截；`最近 / 最初 / 最后 / 第一次` 等时间用法放行。压力题的题干、选项、两档 label 与文案都参与禁用词和诊断词检查。

## 状态

- 猫册与狗册均已开放：45 题 + 4 道压力题、16 型、类型库、维度页、轨迹与双宠对照。
- 纯客户端；无账号、无数据库、无服务端状态。
- CI：GitHub Actions 运行 verify（typecheck + 内容校验 + 单测 + build）与 Playwright Chromium 冒烟。
- 部署：EdgeOne Makers（免费版），构建命令 `npm run build`，输出 `.next`。
- 许可：MIT。

## 文档

| 文档 | 内容 |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | 产品定位、测量框架、内容本体、验收标准 |
| [`docs/research/`](docs/research/) | 竞品与学术依据（带日期快照） |
| [`AGENTS.md`](AGENTS.md) | AI 协作红线、技术栈、命令与文档路由 |

## 许可

MIT © pawscribe
