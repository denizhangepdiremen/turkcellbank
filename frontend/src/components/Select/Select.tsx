import {
  forwardRef,
  useId,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'

/** Açılır listedeki tek bir seçenek */
export interface SelectOption {
  value: string
  label: string
}

/**
 * Select: açılır liste (native <select> üzerine kurulu).
 * Input ile aynı görünüm dilini paylaşır (label, error, indigo focus).
 *
 *  - options     : seçenek listesi [{ value, label }]
 *  - placeholder : ilk (boş) seçenek metni — seçim yapılmadığını gösterir
 */
export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, options, placeholder, id, disabled, ...props },
    ref,
  ) => {
    const generatedId = useId()
    const selectId = id ?? generatedId

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              // appearance-none: tarayıcının varsayılan okunu gizle, kendi okumuzu koyalım
              'flex h-10 w-full appearance-none rounded-lg border bg-white px-3 pr-9 ' +
                'text-base text-gray-900 transition-colors focus-visible:outline-none ' +
                'focus-visible:ring-2 focus-visible:ring-offset-1 ' +
                'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60',
              error
                ? 'border-rose-500 focus-visible:ring-rose-500'
                : 'border-gray-300 focus-visible:ring-indigo-500 focus-visible:border-indigo-500',
              className,
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${selectId}-error` : undefined}
            {...props}
          >
            {/* placeholder: seçilemez, değeri boş ilk seçenek */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sağdaki aşağı ok ikonu */}
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
