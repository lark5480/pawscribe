import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于与隐私 · 猫狗性格志',
  description: '猫狗性格志的测量框架、数据与隐私说明，以及使用边界。',
};

export default function AboutPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-12">
      <a href="/" className="mb-8 inline-block text-sm text-stone-400 underline">
        ← 返回首页
      </a>
      <p className="mb-2 text-sm font-medium tracking-widest text-amber-700">ABOUT</p>
      <h1 className="mb-4 text-3xl font-bold">关于与隐私</h1>
      <p className="mb-10 text-base leading-relaxed text-stone-600">
        猫狗性格志用 15 个可溯源的行为学维度，给猫或狗做一份会随时间变化的性格档案。
        这里说明它测什么、怎么算、存了什么，以及它不做什么。
      </p>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">测量框架</h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-600">
          <p>
            15 维 = 5 个模型 × 3 个维度，覆盖应激与安定、活力与探索、社交、自主与领地、情绪与应对。
            每道题只服务一个维度，猫册与狗册使用各自的题库和行为锚点。
          </p>
          <p>
            每题 3 个选项，按 1 / 2 / 3 分计入所属维度；每维 3 题，合计 3–9 分，分档为 L / M / H。
            15 维向量与 16 型模板逐维计算曼哈顿距离，距离最近者为匹配类型；最高相似度低于 60% 时进入兜底型。
          </p>
          <p>
            压力信号独立成轴，不进入 15 维向量，也不参与类型匹配。它只输出「正常范围」或「建议关注」两档提示，
            「建议关注」只指向专业人士，不给原因推断或处置方案。
          </p>
          <p>
            每个维度对应的论文出处、原始条目与翻译说明，见
            <a href="/dimensions" className="ml-1 text-amber-700 underline">15 维出处页</a>。
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">数据与隐私</h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-600">
          <p>
            本站没有账号体系、没有数据库、没有 API 路由。答案、结果与历史都只存在当前浏览器里：
            进度与历史使用 localStorage，压力分使用 sessionStorage。
          </p>
          <p>
            历史记录保存 15 维向量、结果编码、测试时间与物种 / 宠物标识，不保存题目答案与压力分；
            记录按物种与宠物组合隔离，每个组合最多 20 条。历史不上传、不导出，清空入口只影响当前物种的记录。
          </p>
          <p>
            结果链接只携带 15 维向量，不含答案、压力分或历史记录。把链接分享给别人，对方看到的是同一份结果，
            不会看到你的答题过程。
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">免责声明</h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-600">
          <p>本测试基于日常行为观察，仅供自我了解与参考，不构成兽医学或动物行为学诊断。</p>
          <p>毛孩的行为会随年龄、健康状况与环境变化，建议定期复测。</p>
          <p>若你或宠物存在紧急风险或健康问题，请及时寻求专业机构与持证人士帮助。</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-8">
        <h2 className="mb-4 text-lg font-bold">已知边界</h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-600">
          <p>
            维度有论文出处，但「主人自评」在娱乐测试语境下的信效度还没有经过大样本验证。
            结果是一份行为倾向的快照，不是永久标签。
          </p>
          <p>
            类型匹配与双宠对照都基于 15 维行为距离，不具常模含义；跨物种不做维度距离对照。
            复测差异只描述变化，不做因果解释。
          </p>
          <p>
            你可以继续查看
            <a href="/library" className="mx-1 text-amber-700 underline">16 型类型库</a>
            或
            <a href="/trace" className="mx-1 text-amber-700 underline">纵向轨迹</a>
            ，也可以直接
            <a href="/test" className="mx-1 text-amber-700 underline">开始测试</a>。
          </p>
        </div>
      </section>

      <p className="mt-10 text-sm leading-relaxed text-stone-500">
        本站以 MIT 许可开源。若你发现文案、出处或算法上的问题，欢迎通过仓库反馈。
      </p>
    </main>
  );
}
