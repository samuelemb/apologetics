import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded bg-public-border/70", className)}
    />
  );
}

export function PublicLoading() {
  return (
    <main className="flex-1 bg-public-background" aria-busy="true" aria-label="Loading content">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
        <Skeleton className="h-4 w-28" />
        <div className="mt-9 flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-10 w-44" />
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            {Array.from({ length: 4 }, (_, index) => (
              <article
                key={index}
                className="grid gap-4 border-b border-public-border pb-5 sm:grid-cols-[11.5rem_minmax(0,1fr)]"
              >
                <Skeleton className="aspect-[16/10] w-full sm:h-32" />
                <div className="space-y-3 py-1">
                  <Skeleton className="h-6 w-3/5" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                  <div className="flex gap-3 pt-2">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="hidden space-y-4 lg:block" aria-hidden="true">
            {["Popular articles", "Categories", "Stay updated"].map((title) => (
              <section key={title} className="rounded-[var(--public-radius)] border border-public-border bg-public-surface p-5 shadow-[var(--public-shadow)]">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-3 h-0.5 w-8 bg-public-primary/60" />
                <div className="mt-5 space-y-4">
                  {Array.from({ length: title === "Popular articles" ? 4 : 3 }, (_, index) => (
                    <div key={index} className="flex gap-3">
                      <Skeleton className="size-14 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-3/5" /></div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
