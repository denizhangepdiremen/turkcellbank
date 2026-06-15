import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

/**
 * inputVariants: input kutusunun görünümünü tanımlar.
 * Tek değişken var: "state" (normal mi, hatalı mı).
 * Hatalı durumda çerçeve ve focus halkası kırmızıya döner.
 */
const inputVariants = cva(
  // Ortak class'lar: tam genişlik, yükseklik, kenar, focus halkası, disabled görünümü
  'flex h-10 w-full rounded-lg border bg-white px-3 text-base text-gray-900 ' +
    'placeholder:text-gray-400 transition-colors focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 ' +
    'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60',
  {
    variants: {
      state: {
        // Normal: gri kenar, indigo focus
        default:
          'border-gray-300 focus-visible:ring-indigo-500 focus-visible:border-indigo-500',
        // Hatalı: kırmızı kenar ve kırmızı focus
        error:
          'border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  },
)

/**
 * Input props'ları:
 *  - Standart <input> özelliklerini (value, onChange, placeholder, type...) miras alır.
 *  - label : input'un üstünde gösterilecek etiket (opsiyonel).
 *  - error : hata mesajı. Doluysa kutu kırmızıya döner ve mesaj altta gösterilir.
 *  - VariantProps'tan "state" gelir ama biz onu error'a göre otomatik belirleyeceğiz.
 */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    Omit<VariantProps<typeof inputVariants>, 'state'> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', id, disabled, ...props }, ref) => {
    // Her input'a benzersiz bir id üret (label ile input'u bağlamak için).
    // Dışarıdan id verilmişse onu kullan.
    const generatedId = useId()
    const inputId = id ?? generatedId

    // Şifre alanlarında "göster/gizle" için kendi state'imizi tutuyoruz.
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    // Şifre görünür olsun istiyorsak type'ı geçici olarak "text" yaparız.
    const effectiveType = isPassword && showPassword ? 'text' : type

    return (
      <div className="flex w-full flex-col gap-1.5">
        {/* Etiket (varsa) — htmlFor ile input'a bağlanır, erişilebilirlik için önemli */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        {/* input'u saran kutu: göz ikonunu sağa konumlandırmak için relative */}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            disabled={disabled}
            // error doluysa "error" görünümü, değilse "default"
            className={cn(
              inputVariants({ state: error ? 'error' : 'default' }),
              // şifre alanında göz ikonuna yer açmak için sağdan boşluk
              isPassword && 'pr-10',
              className,
            )}
            // Erişilebilirlik: hata varsa ekran okuyuculara bildir
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />

          {/* Şifre göster/gizle butonu (sadece password type'ta) */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              // Erişilebilirlik: ikon-butona açıklayıcı etiket
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>

        {/* Hata mesajı (varsa) — kırmızı, küçük yazı */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

/* --- Küçük göz ikonları (şifre göster/gizle için) --- */

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

export { inputVariants }
