export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="mb-4 text-2xl font-bold">这个页面不存在</h1>
      <p className="mb-8 text-sm leading-relaxed text-stone-500">
        链接可能输错了，或者页面已经换位置。结果页的地址是 1–5 位字母数字代码。
      </p>
      <div className="flex flex-col items-center gap-3">
        <a href="/" className="rounded-full bg-amber-700 px-8 py-3 font-medium text-white transition hover:bg-amber-800">
          返回首页
        </a>
        <a href="/test" className="text-sm text-stone-500 underline">
          开始测试
        </a>
      </div>
    </main>
  );
}
