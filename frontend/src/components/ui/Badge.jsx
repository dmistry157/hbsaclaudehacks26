import { cn } from '../../lib/utils'

export function Badge({ children, className, dot, dotColor }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor)} />
      )}
      {children}
    </span>
  )
}
