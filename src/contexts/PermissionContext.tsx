import React, { createContext, useContext, ReactNode } from 'react'
import { useCurrentAdmin, Admin, AdminService, AdminPermission } from '../db/adminService'

interface PermissionContextType {
  admin: Admin | null
  permissions: AdminPermission
  loading: boolean
  hasPermission: (permission: AdminPermission) => boolean
  canWrite: boolean
  canRead: boolean
  isAdmin: boolean
  adminService: AdminService
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { admin, permissions, loading, adminService } = useCurrentAdmin()

  const hasPermission = (permission: AdminPermission): boolean => {
    try {
      return adminService.hasPermission(permissions, permission)
    } catch (error) {
      console.error('Error checking permissions:', error)
      return false
    }
  }

  const canWrite = hasPermission('write')
  const canRead = hasPermission('read')
  const isAdmin = hasPermission('admin')

  return (
    <PermissionContext.Provider value={{
      admin,
      permissions,
      loading,
      hasPermission,
      canWrite,
      canRead,
      isAdmin,
      adminService
    }}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}
