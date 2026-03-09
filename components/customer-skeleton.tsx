"use client"

export function CustomerSkeleton() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md sm:max-w-lg">
        {/* Header skeleton */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="h-8 w-20 rounded-lg skeleton-shimmer" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full skeleton-shimmer" />
              <div className="h-9 w-9 rounded-full skeleton-shimmer" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 stagger-children">
          {/* Greeting skeleton */}
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-56 rounded-lg skeleton-shimmer" />
          </div>

          {/* Membership card skeleton */}
          <div className="h-40 rounded-2xl skeleton-shimmer" />

          {/* Story promos skeleton */}
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <div className="h-16 w-16 rounded-full skeleton-shimmer" />
                <div className="h-3 w-12 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>

          {/* Bento actions skeleton */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 h-24 rounded-2xl skeleton-shimmer" />
            <div className="h-24 rounded-2xl skeleton-shimmer" />
            <div className="h-20 rounded-2xl skeleton-shimmer" />
            <div className="h-20 rounded-2xl skeleton-shimmer" />
            <div className="h-20 rounded-2xl skeleton-shimmer" />
          </div>

          {/* QR card skeleton */}
          <div className="h-28 rounded-2xl skeleton-shimmer" />

          {/* Check-in skeleton */}
          <div className="h-32 rounded-2xl skeleton-shimmer" />

          {/* Offers skeleton */}
          <div className="h-44 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    </main>
  )
}
