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
  try {
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
  } catch (error) {
    console.error('Error in PermissionProvider:', error)
    // Provide fallback context with loading state to prevent flash
    const fallbackAdminService = new AdminService()
    return (
      <PermissionContext.Provider value={{
        admin: null,
        permissions: 'none',
        loading: true, // Keep loading true to prevent access denied flash
        hasPermission: () => false,
        canWrite: false,
        canRead: false,
        isAdmin: false,
        adminService: fallbackAdminService
      }}>
        {children}
      </PermissionContext.Provider>
    )
  }
}

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}
