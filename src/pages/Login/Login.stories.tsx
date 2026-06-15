import type { Meta, StoryObj } from '@storybook/react-vite'
import { Login } from './Login'

/**
 * Login ekranının Storybook gösterimi.
 * Tüm sayfayı kapladığı için layout: 'fullscreen' kullanıyoruz.
 */
const meta = {
  title: 'Pages/Login',
  component: Login,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Login>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
