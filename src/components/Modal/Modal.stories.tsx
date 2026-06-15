import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Modal } from './Modal'
import { Button } from '../Button'

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
  // Modal'ın zorunlu prop'ları; aşağıdaki render kendi state'ini kullandığı
  // için bunlar yalnızca tip gereksinimini karşılar.
  args: { open: false, onClose: () => {} },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Modal açık/kapalı bir state ile yönetilir.
 * Bu örnekte bir butonla açıp onay/iptal butonlarıyla kapatıyoruz.
 */
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 40 }}>
        <Button onClick={() => setOpen(true)}>Modalı Aç</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="İşlemi Onayla"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Onayla
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, color: '#374151' }}>
            ₺500 tutarındaki transferi onaylıyor musunuz?
          </p>
        </Modal>
      </div>
    )
  },
}
