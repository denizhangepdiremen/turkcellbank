import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'

/**
 * Login ekranının Storybook gösterimi.
 * Tüm sayfayı kapladığı için layout: 'fullscreen' kullanıyoruz.
 * Login içinde <Link> olduğu için MemoryRouter ile sarmalıyoruz.
 */
const meta = {
  title: 'Pages/Login',
  component: Login,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Login>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
