import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { Register } from './Register'

/**
 * Register, içinde <Link> kullandığı için bir Router bağlamına ihtiyaç duyar.
 * Storybook'ta bunu MemoryRouter ile sağlıyoruz.
 */
const meta = {
  title: 'Pages/Register',
  component: Register,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Register>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
