import { createContext } from 'react'
import type { Admin, AdminService, AdminPermission } from '../db/adminService'

export interface PermissionContextType {
  admin: Admin | null
  permissions: AdminPermission
  loading: boolean
  hasPermission: (permission: AdminPermission) => boolean
  canWrite: boolean
  canRead: boolean
  isAdmin: boolean
  adminService: AdminService
}

// Keep context identity independent of the component/hook hot-reload boundary.
// Otherwise an updated consumer can read a new context from an older provider.
export const PermissionContext = createContext<PermissionContextType | undefined>(undefined)
