
import { useTranslation } from 'react-i18next'
import ClientsTable from './ClientTable'
import AumChart from './AumChart'

const Dashboard = () => {
  useTranslation()
  return (
      <><AumChart /><ClientsTable /></>
  )
}

export default Dashboard
