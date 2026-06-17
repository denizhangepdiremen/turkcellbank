import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'
import { AuthProvider } from '../../context/AuthContext'

/**
 * Login ekranının Storybook gösterimi.
 * Tüm sayfayı kapladığı için layout: 'fullscreen' kullanıyoruz.
 * Login içinde <Link> (Router) ve useAuth (AuthProvider) olduğu için ikisiyle sarmalıyoruz.
 */
const meta = {
  title: 'Pages/Login',
  component: Login,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Login>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
