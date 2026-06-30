export function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-[68px] animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel)]" />
      <div className="grid grid-cols-4 gap-2 max-[760px]:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel)]" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel)]" />
      <div className="h-72 animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel)]" />
    </div>
  );
}
