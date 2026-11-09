'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="mb-4 text-2xl font-bold">页面出了点问题</h1>
      <p className="mb-8 text-sm leading-relaxed text-stone-500">
        你的本机数据没有变动。可以重试，或回到首页重新进入。
      </p>
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-amber-700 px-8 py-3 font-medium text-white transition hover:bg-amber-800"
        >
          重试
        </button>
        <a href="/" className="text-sm text-stone-500 underline">
          返回首页
        </a>
      </div>
    </main>
  );
}
