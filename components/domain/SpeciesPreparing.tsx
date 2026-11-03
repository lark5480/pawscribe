export default function SpeciesPreparing({ species }: { species: 'cat' | 'dog' }) {
  const label = species === 'dog' ? '狗册' : '猫册';
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-sm font-medium tracking-widest text-amber-700">PAWSCRIBE</p>
      <h1 className="mb-4 text-3xl font-bold">{label}准备中</h1>
      <p className="mb-10 max-w-md text-base leading-relaxed text-stone-600">
        {label}的题目、维度锚点与类型文案尚未上线。当前只开放猫册，狗册内容会在后续单独发布。
        这里的入口不会展示占位题目或临时文案。
      </p>
      <a
        href="/test"
        className="rounded-full bg-amber-700 px-8 py-3 text-base font-medium text-white transition hover:bg-amber-800"
      >
        去猫册测试
      </a>
      <a href="/" className="mt-4 text-sm text-stone-500 underline">
        返回首页
      </a>
    </main>
  );
}
