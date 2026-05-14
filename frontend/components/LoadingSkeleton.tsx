export function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="bg-white border border-line rounded-xl p-4 shadow-sm space-y-2">
        <div className="h-4 w-24 bg-skeleton rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-skeleton rounded-md animate-pulse" />
        ))}
      </div>
      <div className="bg-white border border-line rounded-xl p-5 shadow-sm space-y-3">
        <div className="h-4 w-16 bg-skeleton rounded animate-pulse" />
        <div className="h-3 w-full bg-skeleton rounded animate-pulse" />
        <div className="h-3 w-11/12 bg-skeleton rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-skeleton rounded animate-pulse" />
        <div className="flex gap-2 pt-1">
          <div className="h-9 w-28 bg-skeleton rounded-md animate-pulse" />
          <div className="h-9 w-32 bg-skeleton rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  );
}
