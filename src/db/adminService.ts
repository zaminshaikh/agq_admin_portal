import React from 'react'
import { collection, getFirestore, getDocs, doc, getDoc, Firestore, CollectionReference, DocumentData, query, where } from 'firebase/firestore'
import { app, auth } from '../App'
import { User } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

export interface Admin {
  id: string
  name: string
  email: string
  // permissions field removed - now in Firebase Auth custom claims
  createdAt: Date
  updatedAt: Date
  updatedBy: string
}

export type AdminPermission = 'none' | 'read' | 'write' | 'admin'

export interface AdminClaims {
  adminPermissions: AdminPermission
}

export class AdminService {
  private db: Firestore = getFirestore(app)
  private adminsCollection: CollectionReference<DocumentData, DocumentData>
  private functions = getFunctions(app)

  constructor() {
    this.adminsCollection = collection(this.db, 'admins')
  }

  /**
   * Get current admin information based on authenticated user UID
   */
  async getCurrentAdmin(user: User): Promise<{ admin: Admin | null, permissions: AdminPermission }> {
    try {
      console.log('🔍 getCurrentAdmin called for user:', { uid: user.uid, email: user.email })
      
      // Get admin document using UID as document ID
      const adminDocRef = doc(this.db, 'admins', user.uid)
      const adminDoc = await getDoc(adminDocRef)
      
      console.log('📄 Admin document result:', { 
        exists: adminDoc.exists(),
        id: adminDoc.id,
        data: adminDoc.exists() ? adminDoc.data() : null
      })
      
      if (!adminDoc.exists()) {
        console.log('❌ No admin document found, trying to list all admin documents...')
        
        // Try to get all admin documents to see what's there
        try {
          const allAdmins = await getDocs(this.adminsCollection)
          console.log('📊 All admin documents:', allAdmins.docs.map(doc => ({ 
            id: doc.id, 
            data: doc.data() 
          })))
        } catch (error) {
          console.error('Error fetching all admin docs:', error)
        }
        
        return { admin: null, permissions: 'none' }
      }
      
      const adminData = adminDoc.data()!

      // Get permissions from Firebase Auth custom claims
      const idTokenResult = await user.getIdTokenResult()
      console.log('🔐 Full ID token result:', idTokenResult)
      console.log('🔐 Custom claims:', idTokenResult.claims)
      console.log('📋 Admin permissions claim:', idTokenResult.claims.adminPermissions)
      const permissions = (idTokenResult.claims.adminPermissions as AdminPermission) || 'none'

      console.log('✅ Admin data found:', adminData)
      console.log('🔐 Final permissions:', permissions)
      
      const admin: Admin = {
        id: adminDoc.id,
        name: adminData.name,
        email: adminData.email,
        createdAt: adminData.createdAt?.toDate() || new Date(),
        updatedAt: adminData.updatedAt?.toDate() || new Date(),
        updatedBy: adminData.updatedBy || ''
      }

      return { admin, permissions }
    } catch (error) {
      console.error('Error fetching current admin:', error)
      return { admin: null, permissions: 'none' }
    }
  }

  /**
   * Get all admins (requires admin permission) - uses Cloud Function
   */
  async getAllAdmins(): Promise<(Admin & { permissions: AdminPermission })[]> {
    try {
      const getAllAdminsFunction = httpsCallable(this.functions, 'getAllAdmins')
      const result = await getAllAdminsFunction()
      
      const data = result.data as { success: boolean, admins: any[] }
      
      if (!data.success) {
        throw new Error('Failed to fetch admins')
      }

      return data.admins.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        permissions: admin.permissions as AdminPermission,
        createdAt: admin.createdAt ? new Date(admin.createdAt) : new Date(),
        updatedAt: admin.updatedAt ? new Date(admin.updatedAt) : new Date(),
        updatedBy: admin.updatedBy || ''
      }))
    } catch (error) {
      console.error('Error fetching admins:', error)
      return []
    }
  }

  /**
   * Create admin account via signup (no permission required - creates with 'none' permissions)
   */
  async createAdminAccount(name: string, email: string): Promise<void> {
    try {
      const createAdminAccountFunction = httpsCallable(this.functions, 'createAdminAccount')
      const result = await createAdminAccountFunction({ name, email })
      
      const data = result.data as { success: boolean, message: string }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create admin account')
      }
    } catch (error) {
      console.error('Error creating admin account:', error)
      throw error
    }
  }

  /**
   * Update admin permissions (requires admin permission) - uses Cloud Function
   */
  async updateAdminPermissions(adminId: string, permissions: AdminPermission): Promise<void> {
    try {
      const updateAdminPermissionsFunction = httpsCallable(this.functions, 'updateAdminPermissions')
      const result = await updateAdminPermissionsFunction({ adminId, permissions })
      
      const data = result.data as { success: boolean, message: string }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update admin permissions')
      }
    } catch (error) {
      console.error('Error updating admin permissions:', error)
      throw error
    }
  }

  /**
   * Delete an admin (requires admin permission) - uses Cloud Function
   */
  async deleteAdmin(adminId: string): Promise<void> {
    try {
      const deleteAdminFunction = httpsCallable(this.functions, 'deleteAdmin')
      const result = await deleteAdminFunction({ adminId })
      
      const data = result.data as { success: boolean, message: string }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete admin')
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
      throw error
    }
  }

  /**
   * Check if user has specific permission based on custom claims
   */
  hasPermission(permissions: AdminPermission, requiredPermission: AdminPermission): boolean {
    console.log('checking permission:', permissions, 'required:', requiredPermission)
    
    // No permissions or 'none'
    if (!permissions || permissions === 'none') {
      return false
    }
    
    // Admin permission includes all permissions
    if (permissions === 'admin') {
      return true
    }
    
    // Write permission includes read
    if (requiredPermission === 'read' && permissions === 'write') {
      return true
    }
    
    return permissions === requiredPermission
  }
}

// Hook to get current admin with permissions from custom claims
export const useCurrentAdmin = () => {
  const [user] = useAuthState(auth)
  const [admin, setAdmin] = React.useState<Admin | null>(null)
  const [permissions, setPermissions] = React.useState<AdminPermission>('none')
  const [loading, setLoading] = React.useState(true)
  const adminService = new AdminService()

  React.useEffect(() => {
    const fetchAdmin = async () => {
      try {
        if (user) {
          const { admin: adminData, permissions: adminPermissions } = await adminService.getCurrentAdmin(user)
          setAdmin(adminData)
          setPermissions(adminPermissions)
        } else {
          setAdmin(null)
          setPermissions('none')
        }
      } catch (error) {
        console.error('Error fetching admin data:', error)
        setAdmin(null)
        setPermissions('none')
      } finally {
        setLoading(false)
      }
    }

    fetchAdmin()
  }, [user])

  return { admin, permissions, loading, adminService }
}
