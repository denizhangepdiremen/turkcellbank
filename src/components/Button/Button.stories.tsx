import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

/**
 * meta: Bu komponentin Storybook'taki genel ayarları.
 *  - title    : Sol menüde nerede görüneceği ("Components/Button").
 *  - component: Hangi bileşeni gösterdiğimiz.
 *  - argTypes : Storybook arayüzünde elle değiştirebileceğimiz kontroller.
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  // Komponenti panelin ortasında, otomatik dokümantasyonla göster
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    children: 'Buton',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// Her "export" Storybook'ta ayrı bir örnek (story) olarak görünür.

export const Primary: Story = {
  args: { variant: 'primary' },
}

export const Secondary: Story = {
  args: { variant: 'secondary' },
}

export const Outline: Story = {
  args: { variant: 'outline' },
}

export const Ghost: Story = {
  args: { variant: 'ghost' },
}

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Sil' },
}

export const Loading: Story = {
  args: { loading: true, children: 'Yükleniyor' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Pasif' },
}

/** Tüm boyutları yan yana gösteren örnek */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Button {...args} size="sm">
        Küçük
      </Button>
      <Button {...args} size="md">
        Orta
      </Button>
      <Button {...args} size="lg">
        Büyük
      </Button>
    </div>
  ),
}

/** Tüm renk variant'larını bir arada gösteren örnek */
export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
    </div>
  ),
}
