# AGENTS.md —— 《猫狗性格志》AI 协作指南

> 本文只放 AI 必读的内容：不可破坏的红线、技术栈、日常命令、文档路由。
> 业务规则、计分、题库规范、算法细节一律在 `docs/`；人类请看 [`README.md`](README.md)。

**项目**：pawscribe / 猫狗性格志 —— 30 题，给你的猫或狗一份会随时间变化的性格档案
**许可**：MIT

---

## 1. 技术栈

Next.js 14 (App Router) · React 18 · TypeScript 5.5 · Tailwind 3
依赖**仅限** `zod` / `nanoid` / `lucide-react`（`react` / `react-dom` / `next` 是框架自带）。
状态一律用 React 自身 + localStorage，**没有状态库**。
CLI 工具链用 Node 24 原生 TypeScript（`node cli/src/*.ts`），**不引入额外依赖**。

---

## 2. 五条红线

> 违反任何一条都会破坏产品本身，不是「风格问题」。

### 2.1 纯客户端，无服务端状态

答案与结果只存浏览器 localStorage，**不出浏览器**。结果 URL 用 3 进制 / base36 自解码编码（§19.3），**不得引入服务端数据库或账号体系**。

### 2.2 压力信号不参与类型匹配

压力指数（§16.3）**不进入 15 维向量**，因此不参与类型匹配、不改变人格类型。这保证类型匹配公式的最大距离仍是 30，算法不被污染。

### 2.3 每题只服务一个维度

30 题（§16.2）每题**只归属一个维度**，跨维度会污染计分。反向题 `points = 4 - p` 翻转，每维至多 1 题反向。

### 2.4 不做兽医 / 行为诊断

压力两档文案（§16.4）**只指向专业人士**，不给原因推断、不给处置方案、不给程度判断。全文禁用「诊断 / 异常 / 障碍 / 病症」等词描述测试结果。

### 2.5 文案禁用词

最、第一、绝对、一定、治愈、治愈系；以及任何对动物的品质评判。类型中文名必须从**具体行为**长出，不是形容词（§6.5）。

---

## 3. 目录速查

```
app/                 页面（App Router，无 API 路由）
components/domain/   跨页共享组件
lib/engine/          纯函数（计分、匹配、编码、校验、metadata；无 IO）
lib/store/           localStorage 历史与 sessionStorage 压力分
cli/src/             内容生成与校验脚本
content/             猫册 / 狗册 JSON 内容
docs/                PRD + 调研快照
```

页面内状态由 React 自身管理（如 `app/test/TestFlow.tsx`）；仓库中没有 `hooks/`、`types/`、`components/ui|quiz|result` 目录。

### 3.1 真实路由

| 路由 | 说明 |
|---|---|
| `/` | 首页；按物种显示测试与轨迹入口 |
| `/test` | 猫册测试；`?species=dog` 进入狗册 |
| `/result/[code]` | 猫册结果 |
| `/dog/result/[code]` | 狗册结果 |
| `/library` | 类型库；`?species=dog` 为狗册 |
| `/dimensions` | 15 维锚点；`?species=dog` 为狗册 |
| `/about` | 方法论、数据与隐私、免责声明 |
| `/trace` | 纵向轨迹；`?species=dog` 只看狗册记录 |
| `/compare` | 双宠对照；`?species=dog&a=<code>&b=<code>`，跨物种明确拒绝 |

### 3.2 猫册与狗册边界

- 共用 15 维、计分、匹配、base36 编码与 16 型向量。
- 题目、锚点、类型文案、压力题与文案、比较建议均按物种分文件存放。
- 进度、压力分与历史按物种隔离：`pawscribe-progress-v3[:dog]`、`pawscribe-stress:<species>`、`species + petId`。

---

## 4. 极简命令

```bash
npm install
npm run dev              # 本地开发 :3000
npm run typecheck
npm test
npm run build
npm run cli:validate     # 猫狗两册内容校验

# CLI 工具链
npm run cli:types                    # 生成 16 型，输出到 stdout
npm run cli:quiz                     # 生成/校验猫册 30 题
npm run cli:quiz:dog                 # 生成/校验狗册 30 题
npm run cli:copy                     # 生成/校验猫册 16 型文案
npm run cli:copy:dog                 # 生成/校验狗册 16 型文案
npm run cli:stress                   # 生成/校验猫册压力信号
npm run cli:stress:dog               # 生成/校验狗册压力信号
npm run cli:advice:dog               # 生成/校验狗册比较建议
```

仓库没有 ESLint 配置，**不存在可用的 `npm run lint`**；自检请用 `typecheck` + `test` + `build`。

---

## 5. 改代码前必读

| 你要改什么 | 先读 |
|---|---|
| 产品定位 / 玩法规则 / 验收标准 | [`docs/PRD.md`](docs/PRD.md) |
| 15 维定义 / 计分 / 匹配算法 | [`docs/PRD.md`](docs/PRD.md) §6 |
| 30 题 / 压力信号 / 16 型文案 | [`docs/PRD.md`](docs/PRD.md) §16-17 |
| 竞品与学术依据 | [`docs/research/`](docs/research/) |
| 部署 / EdgeOne Makers | 本文 §6 |

---

## 6. 部署

**平台**：EdgeOne Makers（免费版），复用《通识局》云轨经验。

| 项 | 值 |
|---|---|
| 构建命令 | `npm run build` |
| 输出目录 | `.next` |
| 运行时 | Node.js（本项目纯客户端，可不用 Node Functions） |
| `edgeone.json` | `nodeFunctionsConfig.maxDuration = 120` **必须保留** |

**部署步骤**：
1. 推代码到 GitHub（`dev` → `master`）。
2. EdgeOne Makers 控制台新建项目 → 导入仓库 → 构建命令 `npm run build` → 输出 `.next`。
3. 自定义域名 + 免费 SSL。

---

## 7. 改动纪律

1. **先看现状再改** —— 读邻近文件，沿用既有命名与模式。
2. **共享逻辑改一侧要测两侧** —— `lib/engine/*` 是客户端与服务端共用的。
3. **新逻辑补单测** —— 计分、匹配、编码是核心，必须有测试。
4. **一个事实一个权威源** —— 决策结论写进 PRD 对应章节，不单独建档；`docs/research/` 是带日期的一次性快照，只作时点证据，不回改。
5. **文档分层** —— 人类入口 `README.md`、AI 入口 `AGENTS.md`、长文与规则 `docs/`。
6. **分支流程** —— 日常改动先进 `dev`；确认后提交并开 PR 合入 `main`；`main` 为可发布分支，只接受 PR 合入，不在 `main` 上直接开发。
