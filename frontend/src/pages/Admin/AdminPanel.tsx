import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { Card, CardContent } from '../../components/Card'
import { useAuth } from '../../context/AuthContext'
import { getUsers } from '../../api/adminApi'
import './AdminPanel.css'

export function AdminPanel() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
  })
  const users = data?.data ?? []

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
        <h2 className="admin-section-title">Kullanıcılar</h2>

        <Card>
          <CardContent>
            {isLoading && (
              <div className="admin-state">
                <Spinner />
              </div>
            )}
            {isError && <Alert variant="error">Kullanıcılar yüklenemedi.</Alert>}

            {!isLoading && !isError && (
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

        {/* Kredi modülü gelince onay/red ekranı buraya eklenecek */}
        <div className="admin-soon">
          Kredi başvuruları (onay/red) yakında eklenecek (Sprint 3).
        </div>
      </div>
    </div>
  )
}
