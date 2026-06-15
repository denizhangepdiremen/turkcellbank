import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'

const meta = {
  title: 'Pages/Dashboard',
  component: Dashboard,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Dashboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
