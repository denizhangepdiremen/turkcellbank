import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

/**
 * buttonVariants: butonun görünüm seçeneklerini (variant/size) tek yerde tanımlar.
 *
 * cva (class-variance-authority) çalışma mantığı:
 *  1) İlk parametre  -> her butonda HER ZAMAN bulunan ortak Tailwind class'ları.
 *  2) variants       -> seçilebilir görünümler (renk teması, boyut).
 *  3) defaultVariants-> hiçbir seçim yapılmazsa kullanılacak varsayılanlar.
 */
const buttonVariants = cva(
  // Ortak class'lar: her butonda geçerli (hizalama, geçiş efekti, focus halkası,
  // disabled görünümü). Bunlar tüm variant'larda sabit kalır.
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ' +
    'cursor-pointer',
  {
    variants: {
      // Renk teması seçenekleri
      variant: {
        // Birincil aksiyon: Turkcell sarısı dolgulu
        primary:
          'bg-yellow-400 text-gray-900 hover:bg-yellow-500 focus-visible:ring-yellow-400',
        // İkincil aksiyon: gri dolgulu
        secondary:
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400',
        // Çerçeveli (içi boş) buton
        outline:
          'border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-400',
        // Arka planı olmayan, sade buton (örn. "İptal" gibi)
        ghost:
          'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-400',
        // Tehlikeli/silme aksiyonu: kırmızı
        destructive:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
      },
      // Boyut seçenekleri
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

/**
 * Button props'ları:
 *  - Standart <button> özelliklerini (onClick, type, disabled...) miras alır.
 *  - VariantProps sayesinde variant ve size otomatik tip-güvenli olur.
 *  - loading: true iken buton spinner gösterir ve tıklanamaz hale gelir.
 */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

/**
 * Button bileşeni.
 * forwardRef ile sarmalandı ki dışarıdan butona ref verilebilsin
 * (örn. form kütüphaneleri veya focus yönetimi için gereklidir).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        // cn: variant'lardan gelen class'lar + dışarıdan gelen className birleşir
        className={cn(buttonVariants({ variant, size }), className)}
        // loading sırasında da butonu tıklanamaz yap
        disabled={disabled || loading}
        {...props}
      >
        {/* loading aktifse dönen bir spinner göster */}
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
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
        )}
        {children}
      </button>
    )
  },
)

// React DevTools'ta bileşenin adı "Button" görünsün diye:
Button.displayName = 'Button'

export { buttonVariants }
