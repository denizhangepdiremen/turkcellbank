import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '../../components/Card'
import { Skeleton } from '../../components/Skeleton'
import { getTeam } from '../../api/orgApi'
import { roleLabel } from '../../lib/roles'
import './OrgTeamView.css'

/** Yönetici organizasyon görünümü: özet istatistikler + bir alt kademe ekip. */
export function OrgTeamView() {
  const { data, isLoading } = useQuery({ queryKey: ['org-team'], queryFn: getTeam })
  const view = data?.data

  if (isLoading) {
    return <Card><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
  }
  if (!view) {
    return <Card><CardContent><div className="org-empty">Görünüm yüklenemedi.</div></CardContent></Card>
  }

  return (
    <Card>
      <CardContent>
        <div className="org-head">
          <p className="org-title">{view.title}</p>
          <p className="org-subtitle">{view.subtitle}</p>
        </div>

        <div className="org-stats">
          {view.stats.map((s) => (
            <div key={s.label} className="org-stat">
              <span className="org-stat-value">{s.value}</span>
              <span className="org-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

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
