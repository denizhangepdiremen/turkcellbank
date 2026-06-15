import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

/**
 * Checkbox props'ları:
 *  - Standart <input type="checkbox"> özelliklerini (checked, onChange, disabled...) miras alır.
 *  - label : kutucuğun yanında gösterilecek metin (opsiyonel ama genelde kullanılır).
 *  - error : hata mesajı (örn. "koşulları kabul etmelisiniz"). Doluysa altta kırmızı gösterilir.
 *
 * Not: 'type' özelliğini dışarıdan değiştirmeyi engelliyoruz; bu her zaman checkbox.
 */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, disabled, ...props }, ref) => {
    // label'ı input'a bağlamak için benzersiz id
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="flex flex-col gap-1">
        {/* Kutucuk + etiket aynı satırda, tıklanınca kutucuk işaretlensin diye <label> sarmalı */}
        <label
          htmlFor={inputId}
          className={cn(
            'flex items-center gap-2 text-sm text-gray-700',
            // disabled iken imleç ve solukluk
            disabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer',
          )}
        >
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className={cn(
              // Tailwind: kutucuk boyutu, köşe, indigo işaret rengi (accent-color),
              // focus halkası ve hata durumunda kırmızı kenar
              'h-4 w-4 rounded border-gray-300 accent-indigo-600 ' +
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
              error && 'border-rose-500',
              className,
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {label && <span>{label}</span>}
        </label>

        {/* Hata mesajı (varsa) */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
