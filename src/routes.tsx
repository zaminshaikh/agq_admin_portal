import React, { LazyExoticComponent, FC, ReactNode } from 'react'
import { Translation } from 'react-i18next'

export type Route = {
  element?: LazyExoticComponent<FC>
  exact?: boolean
  name?: ReactNode
  path?: string
  routes?: Route[]
}
// IMPORT PATHS
const Activities = React.lazy(() => import('./views/activities/Activities'))
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Statements = React.lazy(() => import('./views/statements/Statements'))
const AdminManagement = React.lazy(() => import('./views/admin/AdminManagement'))

const routes: Route[] = [
  { path: '/', exact: true, name: <Translation>{(t) => t('home')}</Translation> },
  {
    path: '/dashboard',
    name: <Translation>{(t) => t('dashboard')}</Translation>,
    element: Dashboard,
  },
  {
    path: '/activities',
    name: <Translation>{(t) => t('activities')}</Translation>,
    element: Activities,
  },
  {
    path: '/statements',
    name: <Translation>{(t) => t('statements')}</Translation>,
    element: Statements,
  },
  {
    path: '/admin-management',
    name: 'Admin Management',
    element: AdminManagement,
  },
]

export default routes
