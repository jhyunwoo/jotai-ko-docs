import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="max-w-lg rounded-[2rem] border border-border/60 bg-card/75 p-10 text-center shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">404</p>
        <h1 className="mt-4 text-3xl font-black text-foreground">문서를 찾을 수 없습니다</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          요청한 문서 경로가 존재하지 않거나 아직 정적으로 생성되지 않았습니다.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          문서 홈으로 이동
        </Link>
      </div>
    </div>
  )
}

