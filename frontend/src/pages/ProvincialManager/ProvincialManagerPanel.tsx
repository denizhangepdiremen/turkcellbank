import { usePageTitle } from '../../lib/usePageTitle'
import { StaffShell, StaffTabs } from '../staff/StaffShell'
import { LoanApprovalQueue } from '../staff/LoanApprovalQueue'
import { OrgTeamView } from '../staff/OrgTeamView'
import { ManagedCustomers } from '../staff/ManagedCustomers'

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
      <StaffTabs
        tabs={[
          { id: 'loans', label: 'Kredi Onayları', content: <LoanApprovalQueue /> },
          { id: 'customers', label: 'Müşteri Hesapları', content: <ManagedCustomers /> },
          { id: 'org', label: 'İlim', content: <OrgTeamView /> },
        ]}
      />
    </StaffShell>
  )
}
