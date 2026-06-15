import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'Beni hatırla' },
}

export const Checked: Story = {
  args: { label: 'Beni hatırla', defaultChecked: true },
}

export const WithError: Story = {
  args: {
    label: 'Kullanım koşullarını kabul ediyorum',
    error: 'Devam etmek için koşulları kabul etmelisiniz.',
  },
}

export const Disabled: Story = {
  args: { label: 'Pasif seçenek', disabled: true },
}
