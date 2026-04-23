import { cn } from '../../lib/utils'

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-b border-zinc-800/60', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  )
}
