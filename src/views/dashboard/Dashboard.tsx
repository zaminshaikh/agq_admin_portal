import { useState } from 'react'
import { CFormCheck } from '@coreui/react-pro'
import { databaseId } from '../../db/firebaseEnvironment'
import ClientsTable from './ClientTable'
import AumChart from './AumChart'

const preferenceKey = `agq.${databaseId}.hideTestClients`
const Dashboard = () => {
  const [hideTestClients, setHideTestClients] = useState(() => {
    try { return localStorage.getItem(preferenceKey) !== 'false' } catch { return true }
  })
  const [revision, setRevision] = useState(0)
  return <>
    <AumChart refreshVersion={revision} />
    <CFormCheck
      id="hide-test-clients"
      className="mb-3"
      label="Hide test clients"
      checked={hideTestClients}
      onChange={(event) => {
        setHideTestClients(event.target.checked)
        try { localStorage.setItem(preferenceKey, String(event.target.checked)) } catch { /* Browser storage is optional. */ }
      }}
    />
    <ClientsTable hideTestClients={hideTestClients} onClientsChanged={() => setRevision(value => value + 1)} />
  </>
}
export default Dashboard
