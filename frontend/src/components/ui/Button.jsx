import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100',
  outline: 'border border-zinc-700 hover:border-zinc-600 bg-transparent text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50',
}

export function Button({ children, variant = 'primary', className, disabled, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
