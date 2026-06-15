import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './Badge'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'error', 'warning', 'info'],
    },
    children: { control: 'text' },
  },
  args: { children: 'Etiket' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Approved: Story = {
  args: { variant: 'success', children: 'Onaylandı' },
}

export const Rejected: Story = {
  args: { variant: 'error', children: 'Reddedildi' },
}

export const Pending: Story = {
  args: { variant: 'warning', children: 'Bekliyor' },
}

/** Kredi başvuru durumlarını bir arada gösterir */
export const CreditStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge variant="warning">Bekliyor</Badge>
      <Badge variant="success">Onaylandı</Badge>
      <Badge variant="error">Reddedildi</Badge>
      <Badge variant="neutral">Taslak</Badge>
    </div>
  ),
}
