import CIcon from '@coreui/icons-react'
import {
  cilFolderOpen,
  cilLayers,
  cilPeople,
  cilSpeedometer,
} from '@coreui/icons'
import { CNavItem } from '@coreui/react-pro'
import { Translation } from 'react-i18next'
import { usePermissions } from '../contexts/PermissionContext'
import { NavItem } from '../_nav'

export const useConditionalNav = (): NavItem[] => {
  const { isAdmin } = usePermissions()

  const baseNav: NavItem[] = [
    {
      component: CNavItem,
      name: <Translation>{(t) => t('dashboard')}</Translation>,
      to: '/dashboard',
      icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
      badge: {
        color: 'info-gradient',
        text: 'NEW',
      },
    },
    {
      component: CNavItem,
      name: "Activities",
      to: '/activities',
      icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
    },
    {
      component: CNavItem,
      name: "Statements",
      to: '/statements',
      icon: <CIcon icon={cilFolderOpen} customClassName="nav-icon" />,
    },
  ]

  // Add Admin Management tab only for users with admin permissions
  if (isAdmin) {
    baseNav.push({
      component: CNavItem,
      name: "Admin Management",
      to: '/admin-management',
      icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    })
  }

  return baseNav
}
