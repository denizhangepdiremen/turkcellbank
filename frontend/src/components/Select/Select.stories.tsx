import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './Select'

const accountTypes = [
  { value: 'vadesiz', label: 'Vadesiz Hesap' },
  { value: 'vadeli', label: 'Vadeli Hesap' },
  { value: 'doviz', label: 'Döviz Hesabı' },
]

const meta = {
  title: 'Components/Select',
  component: Select,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Hesap Tipi',
    placeholder: 'Seçiniz',
    options: accountTypes,
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithError: Story = {
  args: { error: 'Lütfen bir hesap tipi seçin.' },
}

export const Disabled: Story = {
  args: { disabled: true },
}
