import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'
import { OrgTeamView } from '../staff/OrgTeamView'

/**
 * İl müdürü paneli. 50M–100M kredileri onaylar; ilindeki şube müdürlerini görür.
 */
export function ProvincialManagerPanel() {
  usePageTitle('İl Müdürü')
  return (
    <StaffShell
      title="İl Müdürü Paneli"
      subtitle="50M – 100M kredi onayları; il görünümü."
    >
      <h2 className="staff-section-title">Kredi Onay Kuyruğu</h2>
      <LoanApprovalQueue />

      <h2 className="staff-section-title">İlim</h2>
      <OrgTeamView />
    </StaffShell>
  )
}
