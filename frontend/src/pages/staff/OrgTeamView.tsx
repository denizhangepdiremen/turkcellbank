import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '../../components/Card'
import { Skeleton } from '../../components/Skeleton'
import { getTeam } from '../../api/orgApi'
import { roleLabel } from '../../lib/roles'
import { chartColor } from '../../lib/chartColors'
import { StatIcon, statIconName } from './statIcons'
import type { OrgStat } from '../../lib/types'
import './OrgTeamView.css'

// "Bekleyen kredi (onayım)" → "Kredi" gibi kısa eksen etiketi
function shortPendingLabel(label: string): string {
  if (label.includes('kredi')) return 'Kredi'
  if (label.includes('kart')) return 'Kart'
  if (label.includes('havale')) return 'Havale'
  return label.replace('Bekleyen ', '')
}

/** Yönetici organizasyon görünümü: renkli KPI'lar + bekleyen onay grafiği + ekip. */
export function OrgTeamView() {
  const { data, isLoading } = useQuery({ queryKey: ['org-team'], queryFn: getTeam })
  const view = data?.data

  if (isLoading) {
    return <Card><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
  }
  if (!view) {
    return <Card><CardContent><div className="org-empty">Görünüm yüklenemedi.</div></CardContent></Card>
  }

  // Bekleyen onay stat'larını grafiğe ayır
  const pending = view.stats.filter((s) => s.label.startsWith('Bekleyen'))
  const totalPending = pending.reduce((sum, s) => sum + s.value, 0)
  const pendingData = pending.map((s) => ({
    name: shortPendingLabel(s.label),
    value: s.value,
  }))

  return (
    <Card>
      <CardContent>
        <div className="org-head">
          <p className="org-title">{view.title}</p>
          <p className="org-subtitle">{view.subtitle}</p>
        </div>

        {/* Renkli KPI kartları */}
        <div className="org-stats">
          {view.stats.map((s: OrgStat, i) => (
            <div key={s.label} className="org-kpi">
              <div className="org-kpi-text">
                <span className="org-kpi-value">{s.value}</span>
                <span className="org-kpi-label">{s.label}</span>
              </div>
              <span
                className="org-kpi-icon"
                style={{ color: chartColor(i), backgroundColor: `${chartColor(i)}1a` }}
              >
                <StatIcon name={statIconName(s.label)} />
              </span>
            </div>
          ))}
        </div>

        {/* Bekleyen onaylar grafiği */}
        {pendingData.length > 0 && (
          <div className="org-chart">
            <p className="org-chart-title">Bekleyen Onaylar</p>
            {totalPending === 0 ? (
              <p className="org-chart-empty">Bekleyen onay yok — kuyruk temiz.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, pendingData.length * 56)}>
                <BarChart
                  data={pendingData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                >
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={64}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#475569', fontSize: 13 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(v) => [`${Number(v)} adet`, 'Bekleyen']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={26}>
                    {pendingData.map((_, i) => (
                      <Cell key={i} fill={chartColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        <div className="org-members">
          {view.members.length === 0 ? (
            <p className="org-empty">Bağlı personel yok.</p>
          ) : (
            view.members.map((m) => (
              <div key={m.email} className="org-member">
                <div>
                  <p className="org-member-name">{m.fullName}</p>
                  <p className="org-member-sub">{m.email}</p>
                </div>
                <span className="org-member-role">
                  {roleLabel(m.role)}
                  {m.branchName ? ` · ${m.branchName}` : m.city ? ` · ${m.city}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
