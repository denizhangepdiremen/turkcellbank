import { Modal } from '../Modal'
import { Button } from '../Button'

/**
 * Geri alınamaz aksiyonlar için onay diyaloğu.
 * Modal komponentini kullanır; "Emin misiniz?" sorusu + onayla/iptal.
 */
export interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'destructive'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title = 'Onay',
  message,
  confirmLabel = 'Onayla',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, color: '#374151' }}>{message}</p>
    </Modal>
  )
}
