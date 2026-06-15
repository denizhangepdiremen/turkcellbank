import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

/**
 * Modal: ekranın üstünde açılan diyalog kutusu.
 * Banka senaryosu: 3D Secure doğrulama, "Bu işlemi onaylıyor musunuz?" gibi.
 *
 *  - open      : modal açık mı?
 *  - onClose   : kapatma isteği (arka plana tıklama / Esc / X butonu)
 *  - title     : başlık (opsiyonel)
 *  - footer    : alt aksiyon alanı (opsiyonel — genelde butonlar)
 *
 * createPortal ile <body>'nin sonuna render edilir; böylece üst bileşenlerin
 * overflow/z-index kuralları modalı kırpamaz.
 */
export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  // Esc tuşuna basınca kapat
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Modal açıkken arka planın kaymasını engelle
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    // Karartılmış arka plan (overlay). Tıklanınca kapanır.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Asıl kutu. İçine tıklama overlay'e gitmesin diye stopPropagation. */}
      <div
        className={cn(
          'w-full max-w-md rounded-xl bg-white shadow-xl',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık satırı + kapatma (X) butonu */}
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Kapat"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="p-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 p-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
