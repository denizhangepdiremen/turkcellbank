import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardFooter } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../context/AuthContext'
import { getAccounts, createAccount, closeAccount } from '../../api/accountApi'
import type { AccountType } from '../../lib/types'
import './Dashboard.css'

const accountTypeOptions = [
  { value: 'Bireysel', label: 'Bireysel Hesap' },
  { value: 'Isletme', label: 'İşletme Hesabı' },
]

// Para biçimlendirme (₺12.450,75)
const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(n)

export function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<AccountType>('Bireysel')

  // Hesapları çek (TanStack Query: loading/error/cache otomatik)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })
  const accounts = data?.data ?? []

  // Hesap açma — başarıda listeyi otomatik tazele
  const createMutation = useMutation({
    mutationFn: (type: AccountType) => createAccount(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setModalOpen(false)
    },
  })

  // Hesap kapatma — başarıda listeyi tazele
  const closeMutation = useMutation({
    mutationFn: (id: string) => closeAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Toplam bakiye: sadece aktif hesaplar
  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0)

  const firstName = user?.fullName?.split(' ')[0] ?? ''

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-brand">TurkcellBank</span>
        <div className="dashboard-user">
          <span className="dashboard-username">{user?.fullName}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Çıkış
          </Button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1 className="dashboard-greeting">Merhaba, {firstName} 👋</h1>

        <div className="dashboard-summary">
          <p className="dashboard-summary-label">Toplam Bakiye</p>
          <p className="dashboard-summary-value">{formatTL(totalBalance)}</p>
        </div>

        <div className="dashboard-section-head">
          <h2 className="dashboard-section-title">Hesaplarım</h2>
          <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
            + Hesap Aç
          </Button>
        </div>

        {/* Durumlar */}
        {isLoading && (
          <div className="dashboard-state">
            <Spinner />
          </div>
        )}
        {isError && <Alert variant="error">Hesaplar yüklenemedi.</Alert>}
        {!isLoading && !isError && accounts.length === 0 && (
          <div className="dashboard-state">
            Henüz hesabınız yok. “+ Hesap Aç” ile başlayabilirsiniz.
          </div>
        )}

        {/* Hesap kartları */}
        {accounts.length > 0 && (
          <div className="dashboard-accounts">
            {accounts.map((acc) => (
              <Card key={acc.id}>
                <CardContent>
                  <div className="dashboard-account-top">
                    <Badge variant="info">
                      {acc.accountType === 'Bireysel' ? 'Bireysel' : 'İşletme'}
                    </Badge>
                    {!acc.isActive && <Badge variant="error">Kapalı</Badge>}
                  </div>
                  <p className="dashboard-account-iban">{acc.iban}</p>
                  <p className="dashboard-account-balance">
                    {formatTL(acc.balance)}
                  </p>
                </CardContent>
                {acc.isActive && (
                  <CardFooter>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={
                        closeMutation.isPending &&
                        closeMutation.variables === acc.id
                      }
                      onClick={() => closeMutation.mutate(acc.id)}
                    >
                      Hesabı Kapat
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}

        <h2 className="dashboard-section-title">Son İşlemler</h2>
        <div className="dashboard-soon">
          Para transferi ve işlem geçmişi yakında eklenecek (Sprint 2).
        </div>
      </div>

      {/* Hesap açma modalı */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Hesap Aç"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(selectedType)}
            >
              Hesap Aç
            </Button>
          </>
        }
      >
        <Select
          label="Hesap Tipi"
          options={accountTypeOptions}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as AccountType)}
        />
        {createMutation.isError && (
          <div style={{ marginTop: '1rem' }}>
            <Alert variant="error">Hesap açılamadı, tekrar deneyin.</Alert>
          </div>
        )}
      </Modal>
    </div>
  )
}
