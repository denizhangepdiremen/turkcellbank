import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card'
import { Button } from '../Button'

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

/** Tüm parçalarıyla tipik bir kart */
export const Default: Story = {
  render: () => (
    <Card style={{ width: 320 }}>
      <CardHeader>
        <CardTitle>Vadesiz Hesap</CardTitle>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
          TR12 0001 0000 0000 1234 5678 90
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600 }}>
          ₺12.450,75
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="primary">
          Para Gönder
        </Button>
        <Button size="sm" variant="outline">
          Detaylar
        </Button>
      </CardFooter>
    </Card>
  ),
}

/** Sadece içerik (header/footer olmadan) */
export const ContentOnly: Story = {
  render: () => (
    <Card style={{ width: 320 }}>
      <CardContent>Basit bir kart içeriği.</CardContent>
    </Card>
  ),
}
