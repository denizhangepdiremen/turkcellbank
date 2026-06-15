import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

/**
 * Badge: küçük durum/etiket rozeti.
 * Banka senaryosu: kredi durumu (bekliyor/onaylandı/reddedildi),
 * işlem tipi, hesap tipi vb.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        // Nötr (gri) — varsayılan
        neutral: 'bg-gray-100 text-gray-700',
        // Onaylandı / başarılı
        success: 'bg-emerald-100 text-emerald-800',
        // Reddedildi / hata
        error: 'bg-rose-100 text-rose-800',
        // Bekliyor / uyarı
        warning: 'bg-amber-100 text-amber-800',
        // Bilgi / marka rengi
        info: 'bg-indigo-100 text-indigo-800',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { badgeVariants }
