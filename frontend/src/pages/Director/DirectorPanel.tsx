import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, StaffTabs } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'
import { OrgTeamView } from '../staff/OrgTeamView'
import { ManagedCustomers } from '../staff/ManagedCustomers'

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
      <StaffTabs
        tabs={[
          { id: 'loans', label: 'Kredi Onayları', content: <LoanApprovalQueue /> },
          { id: 'customers', label: 'Müşteri Hesapları', content: <ManagedCustomers /> },
          { id: 'org', label: 'Tüm Banka', content: <OrgTeamView /> },
        ]}
      />
    </StaffShell>
  )
}
