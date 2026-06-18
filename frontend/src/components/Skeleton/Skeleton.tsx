import { cn } from '../../lib/utils'

/**
 * Skeleton: içerik yüklenirken gösterilen gri, nabız atan placeholder.
 * Örn. <Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-gray-200', className)} />
}
