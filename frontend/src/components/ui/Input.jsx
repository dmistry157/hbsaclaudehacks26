import { cn } from '../../lib/utils'

export function Input({ className, label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2.5',
          'text-sm text-zinc-100 placeholder:text-zinc-600',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50',
          error && 'border-red-700 focus:ring-red-500/50',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
