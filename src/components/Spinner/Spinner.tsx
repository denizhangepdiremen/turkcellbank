import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

/**
 * Spinner: dönen yükleniyor göstergesi.
 * 3 boyut (sm/md/lg). Renk varsayılan olarak indigo;
 * className ile değiştirilebilir (örn. buton içinde beyaz).
 */
const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    },
  },
  defaultVariants: { size: 'md' },
})

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
  // Erişilebilirlik için ekran okuyucuya okunacak metin
  label?: string
}

export function Spinner({
  size,
  className,
  label = 'Yükleniyor',
}: SpinnerProps) {
  return (
    <svg
      className={cn(spinnerVariants({ size }), 'text-indigo-600', className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  )
}

export { spinnerVariants }
