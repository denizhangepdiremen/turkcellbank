import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'
import { OrgTeamView } from '../staff/OrgTeamView'

/**
 * Direktör paneli. 100M üstü kredileri onaylar; tüm bankayı (il müdürleri) görür.
 */
export function DirectorPanel() {
  usePageTitle('Direktör')
  return (
    <StaffShell
      title="Direktör Paneli"
      subtitle="100M üstü kredi onayları; genel görünüm."
    >
      <h2 className="staff-section-title">Kredi Onay Kuyruğu</h2>
      <LoanApprovalQueue />

      <h2 className="staff-section-title">Tüm Banka</h2>
      <OrgTeamView />
    </StaffShell>
  )
}
