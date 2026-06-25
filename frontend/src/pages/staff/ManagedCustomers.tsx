import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { getApiErrorMessage } from '../../lib/apiError'
import { formatIban } from '../../lib/format'
import { chartColor } from '../../lib/chartColors'
import {
  searchManagedCustomer,
  bankFreezeAccount,
  bankUnfreezeAccount,
} from '../../api/managementApi'
import type { Account, ManagedCustomer } from '../../lib/types'

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

/**
 * Yönetici müşteri hesabı yönetimi: müşteriyi TC/e-posta ile bul, hesabına
 * banka bloğu koy/kaldır. Banka bloğunu müşteri kendisi açamaz.
 */
export function ManagedCustomers() {
  const [query, setQuery] = useState('')
  const [customer, setCustomer] = useState<ManagedCustomer | null>(null)
  const [freezeAcc, setFreezeAcc] = useState<Account | null>(null)
  const [reason, setReason] = useState('')

  const search = useMutation({
    mutationFn: (q: string) => searchManagedCustomer(q),
    onSuccess: (res) => setCustomer(res.data ?? null),
    onError: (err) => {
      setCustomer(null)
      toast.error(getApiErrorMessage(err, 'Müşteri bulunamadı.'))
    },
  })

  const refresh = () => {
    if (query.trim()) search.mutate(query.trim())
  }

  const freezeMutation = useMutation({
    mutationFn: () => bankFreezeAccount(freezeAcc!.id, reason),
    onSuccess: () => {
      toast.success('Hesap donduruldu.')
      setFreezeAcc(null)
      setReason('')
      refresh()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap dondurulamadı.')),
  })

  const unfreezeMutation = useMutation({
    mutationFn: (id: string) => bankUnfreezeAccount(id),
    onSuccess: () => {
      toast.success('Hesap yeniden aktifleştirildi.')
      refresh()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Hesap aktifleştirilemedi.')),
  })

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) search.mutate(query.trim())
  }

  return (
    <div>
      <form className="managed-search" onSubmit={onSearch}>
        <Input
          label="Müşteri (TC / e-posta)"
          placeholder="11 haneli TC veya e-posta"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="primary" loading={search.isPending}>
          Ara
        </Button>
      </form>

      {customer && (
        <Card>
          <CardContent>
            <div className="managed-customer-head">
              <div>
                <p className="managed-customer-name">{customer.fullName}</p>
                <p className="managed-customer-sub">
                  {customer.email}
                  {customer.nationalId ? ` · TC ${customer.nationalId}` : ''}
                </p>
              </div>
            </div>

            <CustomerOverview accounts={customer.accounts} />

            {customer.accounts.length === 0 ? (
              <div className="managed-empty">Müşterinin aktif hesabı yok.</div>
            ) : (
              customer.accounts.map((acc) => (
                <div key={acc.id} className="managed-account-row">
                  <div>
                    <p className="managed-account-iban">{formatIban(acc.iban)}</p>
                    <p className="managed-account-sub">
                      {acc.accountType} · {formatTL(acc.balance)}
                      {acc.isFrozen && (
                        <span className="managed-frozen-tag">
                          {acc.freezeType === 'Bank'
                            ? ' · Banka bloğu'
                            : ' · Müşteri dondurması'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="managed-account-actions">
                    <Badge variant={acc.isFrozen ? 'warning' : 'success'}>
                      {acc.isFrozen ? 'Dondurulmuş' : 'Aktif'}
                    </Badge>
                    {acc.isFrozen ? (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={
                          unfreezeMutation.isPending &&
                          unfreezeMutation.variables === acc.id
                        }
                        onClick={() => unfreezeMutation.mutate(acc.id)}
                      >
                        Bloğu Kaldır
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-400"
                        onClick={() => {
                          setFreezeAcc(acc)
                          setReason('')
                        }}
                      >
                        Dondur
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Banka bloğu (dondurma) onayı + sebep */}
      <Modal
        open={!!freezeAcc}
        onClose={() => setFreezeAcc(null)}
        title="Hesabı Dondur (Banka Bloğu)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFreezeAcc(null)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              loading={freezeMutation.isPending}
              onClick={() => freezeMutation.mutate()}
            >
              Hesabı Dondur
            </Button>
          </>
        }
      >
        {freezeAcc && (
          <>
            <p className="managed-lead">
              <strong>{formatIban(freezeAcc.iban)}</strong> hesabına banka bloğu
              konacak. Müşteri bu bloğu kendisi kaldıramaz; bağlı kartlar bloke
              edilir.
            </p>
            <div className="managed-field">
              <Input
                label="Gerekçe (opsiyonel)"
                placeholder="Örn. Şüpheli işlem incelemesi"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

/**
 * Müşteri özeti: toplam bakiye / hesap sayısı / dondurulmuş sayısı KPI'ları
 * + hesaplar arası bakiye dağılımı donut grafiği.
 */
function CustomerOverview({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) return null

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const frozenCount = accounts.filter((a) => a.isFrozen).length

  // Donut: yalnızca bakiyesi olan hesaplar dilim olur
  const donut = accounts
    .filter((a) => a.balance > 0)
    .map((a) => ({ name: `…${a.iban.slice(-4)}`, value: a.balance }))

  return (
    <div className="managed-overview">
      <div className="managed-kpis">
        <div className="managed-kpi">
          <span className="managed-kpi-value">{formatTL(totalBalance)}</span>
          <span className="managed-kpi-label">Toplam bakiye</span>
        </div>
        <div className="managed-kpi">
          <span className="managed-kpi-value">{accounts.length}</span>
          <span className="managed-kpi-label">Hesap sayısı</span>
        </div>
        <div className="managed-kpi">
          <span className="managed-kpi-value">{frozenCount}</span>
          <span className="managed-kpi-label">Dondurulmuş</span>
        </div>
      </div>

      {donut.length > 0 && (
        <div className="managed-chart">
          <p className="managed-chart-title">Bakiye Dağılımı</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={donut}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {donut.map((_, i) => (
                  <Cell key={i} fill={chartColor(i)} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatTL(Number(v))} />
              <Legend verticalAlign="bottom" height={28} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
