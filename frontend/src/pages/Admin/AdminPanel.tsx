import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Skeleton } from '../../components/Skeleton'
import { Alert } from '../../components/Alert'
import { Card, CardContent } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'
import {
  getUsers,
  getLoans,
  approveLoan,
  rejectLoan,
  getPayments,
  refundPayment,
  getCards,
  approveCard,
  rejectCard,
} from '../../api/adminApi'
import { getApiErrorMessage } from '../../lib/apiError'
import { usePageTitle } from '../../lib/usePageTitle'
import type { CardStatus, LoanStatus, PaymentStatus } from '../../lib/types'
import './AdminPanel.css'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

const loanBadgeVariant = (s: LoanStatus) =>
  s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'warning'
const loanLabel = (s: LoanStatus) =>
  s === 'Approved' ? 'Onaylandı' : s === 'Rejected' ? 'Reddedildi' : 'Bekliyor'

const paymentBadgeVariant = (s: PaymentStatus) =>
  s === 'Success' ? 'success' : s === 'Failed' ? 'error' : 'info'
const paymentLabel = (s: PaymentStatus) =>
  s === 'Success' ? 'Başarılı' : s === 'Failed' ? 'Başarısız' : 'İade'

const cardBadgeVariant = (s: CardStatus) =>
  s === 'Approved' ? 'success' : s === 'Rejected' ? 'error' : 'warning'
const cardLabel = (s: CardStatus) =>
  s === 'Approved' ? 'Onaylı' : s === 'Rejected' ? 'Reddedildi' : 'Bekliyor'

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
      <Skeleton className="h-6 w-4/6" />
    </div>
  )
}

export function AdminPanel() {
  usePageTitle('Admin')
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  // Onay diyaloğu durumları
  const [rejectLoanId, setRejectLoanId] = useState<string | null>(null)
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null)
  const [rejectCardId, setRejectCardId] = useState<string | null>(null)

  // --- Kart Başvuruları ---
  const { data: cardsData, isLoading: cardsLoading, isError: cardsError } =
    useQuery({ queryKey: ['admin-cards'], queryFn: getCards })
  const cards = cardsData?.data ?? []
  const refreshCards = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-cards'] })

  const approveCardMutation = useMutation({
    mutationFn: (id: string) => approveCard(id),
    onSuccess: () => {
      refreshCards()
      toast.success('Kart onaylandı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })
  const rejectCardMutation = useMutation({
    mutationFn: (id: string) => rejectCard(id),
    onSuccess: () => {
      refreshCards()
      setRejectCardId(null)
      toast.success('Kart reddedildi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  // --- Krediler ---
  const { data: loansData, isLoading: loansLoading, isError: loansError } =
    useQuery({ queryKey: ['admin-loans'], queryFn: getLoans })
  const loans = loansData?.data ?? []
  const refreshLoans = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-loans'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLoan(id),
    onSuccess: () => {
      refreshLoans()
      toast.success('Başvuru onaylandı.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLoan(id),
    onSuccess: () => {
      refreshLoans()
      setRejectLoanId(null)
      toast.success('Başvuru reddedildi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İşlem başarısız.')),
  })

  // --- Ödemeler ---
  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError } =
    useQuery({ queryKey: ['admin-payments'], queryFn: getPayments })
  const payments = paymentsData?.data ?? []

  const refundMutation = useMutation({
    mutationFn: (id: string) => refundPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      setRefundPaymentId(null)
      toast.success('Ödeme iade edildi.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'İade başarısız.')),
  })

  // --- Kullanıcılar ---
  const { data: usersData, isLoading: usersLoading, isError: usersError } =
    useQuery({ queryKey: ['admin-users'], queryFn: getUsers })
  const users = usersData?.data ?? []

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <span className="admin-brand">
          TurkcellBank<span>Admin</span>
        </span>
        <div className="admin-user">
          <span>{user?.fullName}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Çıkış
          </Button>
        </div>
      </header>

      <div className="admin-body">
        {/* Kart Başvuruları */}
        <h2 className="admin-section-title">Kart Başvuruları</h2>
        <Card>
          <CardContent>
            {cardsLoading && <TableSkeleton />}
            {cardsError && <Alert variant="error">Kartlar yüklenemedi.</Alert>}
            {!cardsLoading && !cardsError && cards.length === 0 && (
              <div className="admin-state">Henüz kart başvurusu yok.</div>
            )}
            {!cardsLoading && !cardsError && cards.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sahip</th>
                      <th>Kart</th>
                      <th>Hesap</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.holderName}
                          <br />
                          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                            {c.holderEmail}
                          </span>
                        </td>
                        <td>{c.maskedCardNumber}</td>
                        <td>...{c.accountIban.slice(-4)}</td>
                        <td>
                          <Badge variant={cardBadgeVariant(c.status)}>
                            {cardLabel(c.status)}
                          </Badge>
                        </td>
                        <td>
                          {c.status === 'Pending' ? (
                            <div className="admin-actions">
                              <Button
                                size="sm"
                                variant="primary"
                                loading={
                                  approveCardMutation.isPending &&
                                  approveCardMutation.variables === c.id
                                }
                                onClick={() => approveCardMutation.mutate(c.id)}
                              >
                                Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectCardId(c.id)}
                              >
                                Reddet
                              </Button>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kredi Başvuruları */}
        <h2 className="admin-section-title admin-section">Kredi Başvuruları</h2>
        <Card>
          <CardContent>
            {loansLoading && <TableSkeleton />}
            {loansError && <Alert variant="error">Başvurular yüklenemedi.</Alert>}
            {!loansLoading && !loansError && loans.length === 0 && (
              <div className="admin-state">Henüz kredi başvurusu yok.</div>
            )}
            {!loansLoading && !loansError && loans.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Başvuran</th>
                      <th>Tutar</th>
                      <th>Vade</th>
                      <th>Gelir</th>
                      <th>Skor</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr key={loan.id}>
                        <td>
                          {loan.applicantName}
                          <br />
                          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                            {loan.applicantEmail}
                          </span>
                        </td>
                        <td>{formatTL(loan.amount)}</td>
                        <td>{loan.termMonths} ay</td>
                        <td>{formatTL(loan.income)}</td>
                        <td>{loan.score}</td>
                        <td>
                          <Badge variant={loanBadgeVariant(loan.status)}>
                            {loanLabel(loan.status)}
                          </Badge>
                        </td>
                        <td>
                          {loan.status === 'Pending' ? (
                            <div className="admin-actions">
                              <Button
                                size="sm"
                                variant="primary"
                                loading={
                                  approveMutation.isPending &&
                                  approveMutation.variables === loan.id
                                }
                                onClick={() => approveMutation.mutate(loan.id)}
                              >
                                Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectLoanId(loan.id)}
                              >
                                Reddet
                              </Button>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ödemeler */}
        <h2 className="admin-section-title admin-section">Ödemeler</h2>
        <Card>
          <CardContent>
            {paymentsLoading && <TableSkeleton />}
            {paymentsError && <Alert variant="error">Ödemeler yüklenemedi.</Alert>}
            {!paymentsLoading && !paymentsError && payments.length === 0 && (
              <div className="admin-state">Henüz ödeme yok.</div>
            )}
            {!paymentsLoading && !paymentsError && payments.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ödeyen</th>
                      <th>Kart</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.payerName}
                          <br />
                          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                            {p.payerEmail}
                          </span>
                        </td>
                        <td>{p.maskedCardNumber}</td>
                        <td>{formatTL(p.amount)}</td>
                        <td>
                          <Badge variant={paymentBadgeVariant(p.status)}>
                            {paymentLabel(p.status)}
                          </Badge>
                        </td>
                        <td>
                          {p.status === 'Success' ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRefundPaymentId(p.id)}
                            >
                              İade Et
                            </Button>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kullanıcılar */}
        <h2 className="admin-section-title admin-section">Kullanıcılar</h2>
        <Card>
          <CardContent>
            {usersLoading && <TableSkeleton />}
            {usersError && <Alert variant="error">Kullanıcılar yüklenemedi.</Alert>}
            {!usersLoading && !usersError && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ad Soyad</th>
                      <th>E-posta</th>
                      <th>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.fullName}</td>
                        <td>{u.email}</td>
                        <td>
                          <Badge variant={u.role === 'Admin' ? 'info' : 'neutral'}>
                            {u.role}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Onay diyalogları --- */}
      <ConfirmDialog
        open={!!rejectLoanId}
        title="Başvuruyu Reddet"
        message="Bu kredi başvurusunu reddetmek istediğinize emin misiniz?"
        confirmLabel="Reddet"
        confirmVariant="destructive"
        loading={rejectMutation.isPending}
        onConfirm={() => rejectLoanId && rejectMutation.mutate(rejectLoanId)}
        onClose={() => setRejectLoanId(null)}
      />
      <ConfirmDialog
        open={!!refundPaymentId}
        title="Ödemeyi İade Et"
        message="Bu ödemeyi iade etmek istediğinize emin misiniz?"
        confirmLabel="İade Et"
        confirmVariant="destructive"
        loading={refundMutation.isPending}
        onConfirm={() => refundPaymentId && refundMutation.mutate(refundPaymentId)}
        onClose={() => setRefundPaymentId(null)}
      />
      <ConfirmDialog
        open={!!rejectCardId}
        title="Kartı Reddet"
        message="Bu kart başvurusunu reddetmek istediğinize emin misiniz?"
        confirmLabel="Reddet"
        confirmVariant="destructive"
        loading={rejectCardMutation.isPending}
        onConfirm={() => rejectCardId && rejectCardMutation.mutate(rejectCardId)}
        onClose={() => setRejectCardId(null)}
      />
    </div>
  )
}
