import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter } from '../../components/Card'
import { Badge, type BadgeProps } from '../../components/Badge'
import { Button } from '../../components/Button'
import './Dashboard.css'

/**
 * Dashboard (giriş sonrası ana ekran) — İSKELET / TASLAK.
 *
 * NOT: Backend henüz yok. Tüm veriler aşağıda sabit (dummy) tanımlı.
 * Backend aşamasında bunlar gerçek API'den (hesaplar, işlemler) gelecek.
 */

// --- Dummy veriler (backend yerine) ---
const accounts = [
  { id: 1, type: 'Vadesiz Hesap', iban: 'TR12 0001 0000 0000 1234 5678 90', balance: '₺12.450,75' },
  { id: 2, type: 'Vadeli Hesap', iban: 'TR98 0001 0000 0000 8765 4321 00', balance: '₺48.000,00' },
  { id: 3, type: 'Döviz Hesabı', iban: 'TR45 0001 0000 0000 1111 2222 33', balance: '$2.300,00' },
]

// İşlem durumlarını Badge variant'ına eşleyen tip
type Transaction = {
  id: number
  desc: string
  date: string
  amount: string
  positive: boolean
  status: string
  statusVariant: BadgeProps['variant']
}

const transactions: Transaction[] = [
  { id: 1, desc: 'Ahmet Yılmaz - EFT', date: '14 Haz 2026, 14:32', amount: '-₺500,00', positive: false, status: 'Tamamlandı', statusVariant: 'success' },
  { id: 2, desc: 'Maaş Ödemesi', date: '13 Haz 2026, 09:00', amount: '+₺18.000,00', positive: true, status: 'Tamamlandı', statusVariant: 'success' },
  { id: 3, desc: 'Market Alışverişi - POS', date: '12 Haz 2026, 19:45', amount: '-₺342,80', positive: false, status: 'Tamamlandı', statusVariant: 'success' },
  { id: 4, desc: 'Kredi Başvurusu', date: '11 Haz 2026, 11:20', amount: '₺25.000,00', positive: true, status: 'Bekliyor', statusVariant: 'warning' },
  { id: 5, desc: 'Havale - Reddedildi', date: '10 Haz 2026, 16:10', amount: '-₺1.200,00', positive: false, status: 'Reddedildi', statusVariant: 'error' },
]

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      {/* Üst bar */}
      <header className="dashboard-header">
        <span className="dashboard-brand">TurkcellBank</span>

        <nav className="dashboard-nav">
          <a href="#">Hesaplarım</a>
          <a href="#">Transferler</a>
          <a href="#">Krediler</a>
          <a href="#">Kartlar</a>
        </nav>

        <div className="dashboard-user">
          <span className="dashboard-username">Ahmet Yılmaz</span>
          {/* Çıkış: şimdilik login'e geri döner */}
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            Çıkış
          </Button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1 className="dashboard-greeting">Merhaba, Ahmet 👋</h1>

        {/* Toplam bakiye özeti */}
        <div className="dashboard-summary">
          <p className="dashboard-summary-label">Toplam Bakiye (TL hesapları)</p>
          <p className="dashboard-summary-value">₺60.450,75</p>
        </div>

        {/* Hesap kartları */}
        <h2 className="dashboard-section-title">Hesaplarım</h2>
        <div className="dashboard-accounts">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent>
                <Badge variant="info">{acc.type}</Badge>
                <p className="dashboard-account-iban">{acc.iban}</p>
                <p className="dashboard-account-balance">{acc.balance}</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="primary">
                  Para Gönder
                </Button>
                <Button size="sm" variant="ghost">
                  Detaylar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Son işlemler */}
        <h2 className="dashboard-section-title">Son İşlemler</h2>
        <Card>
          <CardContent>
            {transactions.map((tx) => (
              <div key={tx.id} className="dashboard-tx-row">
                <div>
                  <p className="dashboard-tx-desc">{tx.desc}</p>
                  <p className="dashboard-tx-date">{tx.date}</p>
                </div>
                <div className="dashboard-tx-right">
                  <Badge variant={tx.statusVariant}>{tx.status}</Badge>
                  <span
                    className={`dashboard-tx-amount ${tx.positive ? 'positive' : 'negative'}`}
                  >
                    {tx.amount}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
