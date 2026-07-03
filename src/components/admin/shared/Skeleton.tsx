export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-stone-800/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-stone-800 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-3 bg-stone-800 rounded w-24" />
        <div className="w-8 h-8 bg-stone-800 rounded-xl" />
      </div>
      <div className="h-7 bg-stone-800 rounded w-32" />
      <div className="h-3 bg-stone-800 rounded w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-stone-800/50">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-stone-800 rounded animate-pulse" style={{ width: `${60 + (j % 3) * 20}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
