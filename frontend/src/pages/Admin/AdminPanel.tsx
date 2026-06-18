import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { Card, CardContent } from '../../components/Card'
import { useAuth } from '../../context/AuthContext'
import {
  getUsers,
  getLoans,
  approveLoan,
  rejectLoan,
  getPayments,
  refundPayment,
} from '../../api/adminApi'
import type { LoanStatus, PaymentStatus } from '../../lib/types'
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

export function AdminPanel() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const { data: usersData, isLoading: usersLoading, isError: usersError } =
    useQuery({ queryKey: ['admin-users'], queryFn: getUsers })
  const users = usersData?.data ?? []

  const { data: loansData, isLoading: loansLoading, isError: loansError } =
    useQuery({ queryKey: ['admin-loans'], queryFn: getLoans })
  const loans = loansData?.data ?? []

  const refreshLoans = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-loans'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLoan(id),
    onSuccess: refreshLoans,
  })
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLoan(id),
    onSuccess: refreshLoans,
  })

  // Ödemeler
  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError } =
    useQuery({ queryKey: ['admin-payments'], queryFn: getPayments })
  const payments = paymentsData?.data ?? []

  const refundMutation = useMutation({
    mutationFn: (id: string) => refundPayment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
  })

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
        {/* Kredi Başvuruları */}
        <h2 className="admin-section-title">Kredi Başvuruları</h2>
        <Card>
          <CardContent>
            {loansLoading && (
              <div className="admin-state">
                <Spinner />
              </div>
            )}
            {loansError && <Alert variant="error">Başvurular yüklenemedi.</Alert>}
            {!loansLoading && !loansError && loans.length === 0 && (
              <div className="admin-state">Henüz kredi başvurusu yok.</div>
            )}
            {!loansLoading && !loansError && loans.length > 0 && (
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
                              loading={
                                rejectMutation.isPending &&
                                rejectMutation.variables === loan.id
                              }
                              onClick={() => rejectMutation.mutate(loan.id)}
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
            )}
          </CardContent>
        </Card>

        {/* Ödemeler */}
        <h2 className="admin-section-title admin-section">Ödemeler</h2>
        <Card>
          <CardContent>
            {paymentsLoading && (
              <div className="admin-state">
                <Spinner />
              </div>
            )}
            {paymentsError && <Alert variant="error">Ödemeler yüklenemedi.</Alert>}
            {!paymentsLoading && !paymentsError && payments.length === 0 && (
              <div className="admin-state">Henüz ödeme yok.</div>
            )}
            {!paymentsLoading && !paymentsError && payments.length > 0 && (
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
                            loading={
                              refundMutation.isPending &&
                              refundMutation.variables === p.id
                            }
                            onClick={() => refundMutation.mutate(p.id)}
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
            )}
          </CardContent>
        </Card>

        {/* Kullanıcılar */}
        <h2 className="admin-section-title admin-section">Kullanıcılar</h2>
        <Card>
          <CardContent>
            {usersLoading && (
              <div className="admin-state">
                <Spinner />
              </div>
            )}
            {usersError && <Alert variant="error">Kullanıcılar yüklenemedi.</Alert>}
            {!usersLoading && !usersError && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
