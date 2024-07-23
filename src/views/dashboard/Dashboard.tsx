
import { useTranslation } from 'react-i18next'
import UsersTable from './ClientTable'

const Dashboard = () => {
  useTranslation()
  return (
      <UsersTable />
  )
}

export default Dashboard
