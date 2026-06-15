import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './Input'

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // Storybook'ta input'a makul bir genişlik vermek için sarmalayıcı
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password'],
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'Ad Soyad', placeholder: 'Adınızı girin' },
}

export const Email: Story = {
  args: {
    label: 'E-posta',
    type: 'email',
    placeholder: 'ornek@turkcellbank.com',
  },
}

export const Password: Story = {
  args: {
    label: 'Şifre',
    type: 'password',
    placeholder: '••••••••',
  },
}

export const WithError: Story = {
  args: {
    label: 'E-posta',
    type: 'email',
    value: 'gecersiz-eposta',
    error: 'Geçerli bir e-posta adresi girin.',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Kullanıcı adı',
    value: 'değiştirilemez',
    disabled: true,
  },
}

export const WithoutLabel: Story = {
  args: { placeholder: 'Etiketsiz input' },
}
