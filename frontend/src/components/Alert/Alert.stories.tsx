import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert } from './Alert'

const meta = {
  title: 'Components/Alert',
  component: Alert,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 380 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
    },
    title: { control: 'text' },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Transfer başarılı',
    children: '₺500 tutarındaki transfer tamamlandı.',
  },
}

export const ErrorAlert: Story = {
  name: 'Error',
  args: {
    variant: 'error',
    title: 'İşlem başarısız',
    children: 'Hesabınızda yeterli bakiye bulunmuyor.',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Dikkat',
    children: 'Günlük transfer limitinize yaklaştınız.',
  },
}

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Bakiyeniz her gece 00:00’da güncellenir.',
  },
}
