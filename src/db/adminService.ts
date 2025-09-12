import React from 'react'
import { collection, getFirestore, getDocs, doc, Firestore, CollectionReference, DocumentData, addDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { app, auth } from '../App'
import { User } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'

export interface Admin {
  id: string
  name: string
  email: string
  permissions: 'read' | 'write' | 'admin'
  createdAt: Date
  updatedAt: Date
  updatedBy: string
}

export class AdminService {
  private db: Firestore = getFirestore(app)
  private adminsCollection: CollectionReference<DocumentData, DocumentData>

  constructor() {
    this.adminsCollection = collection(this.db, 'admins')
  }

  /**
   * Get current admin information based on authenticated user
   */
  async getCurrentAdmin(user: User): Promise<Admin | null> {
    try {
      const adminQuery = query(this.adminsCollection, where('email', '==', user.email))
      const querySnapshot = await getDocs(adminQuery)
      
      if (querySnapshot.empty) {
        return null
      }
      
      const adminDoc = querySnapshot.docs[0]
      const adminData = adminDoc.data()

      console.log('adminData', adminData)
      
      return {
        id: adminDoc.id,
        name: adminData.name,
        email: adminData.email,
        permissions: adminData.permissions || 'read',
        createdAt: adminData.createdAt?.toDate() || new Date(),
        updatedAt: adminData.updatedAt?.toDate() || new Date(),
        updatedBy: adminData.updatedBy || ''
      }
    } catch (error) {
      console.error('Error fetching current admin:', error)
      return null
    }
  }

  /**
   * Get all admins (requires admin permission)
   */
  async getAllAdmins(): Promise<Admin[]> {
    try {
      const querySnapshot = await getDocs(this.adminsCollection)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          permissions: data.permissions || 'read',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy || ''
        }
      })
    } catch (error) {
      console.error('Error fetching admins:', error)
      return []
    }
  }

  /**
   * Create a new admin (requires admin permission)
   */
  async createAdmin(adminData: Omit<Admin, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>, currentAdmin: Admin): Promise<void> {
    try {
      const now = new Date()
      const newAdmin = {
        ...adminData,
        createdAt: now,
        updatedAt: now,
        updatedBy: currentAdmin.name
      }
      
      await addDoc(this.adminsCollection, newAdmin)
    } catch (error) {
      console.error('Error creating admin:', error)
      throw error
    }
  }

  /**
   * Update an admin (requires admin permission)
   */
  async updateAdmin(adminId: string, updates: Partial<Omit<Admin, 'id' | 'createdAt'>>, currentAdmin: Admin): Promise<void> {
    try {
      const adminRef = doc(this.adminsCollection, adminId)
      const updateData = {
        ...updates,
        updatedAt: new Date(),
        updatedBy: currentAdmin.name
      }
      
      await setDoc(adminRef, updateData, { merge: true })
    } catch (error) {
      console.error('Error updating admin:', error)
      throw error
    }
  }

  /**
   * Delete an admin (requires admin permission)
   */
  async deleteAdmin(adminId: string): Promise<void> {
    try {
      const adminRef = doc(this.adminsCollection, adminId)
      await deleteDoc(adminRef)
    } catch (error) {
      console.error('Error deleting admin:', error)
      throw error
    }
  }

  /**
   * Check if current user has specific permission
   */
  hasPermission(admin: Admin | null, permission: 'read' | 'write' | 'admin'): boolean {
    console.log('admin', admin)
    if (!admin || !admin.permissions) {
      return false
    }
    
    // Admin permission includes all permissions
    if (admin.permissions === 'admin') {
      return true
    }
    
    // Write permission includes read
    if (permission === 'read' && admin.permissions === 'write') {
      return true
    }
    
    return admin.permissions === permission
  }
}

// Hook to get current admin
export const useCurrentAdmin = () => {
  const [user] = useAuthState(auth)
  const [admin, setAdmin] = React.useState<Admin | null>(null)
  const [loading, setLoading] = React.useState(true)
  const adminService = new AdminService()

  React.useEffect(() => {
    const fetchAdmin = async () => {
      try {
        if (user) {
          const adminData = await adminService.getCurrentAdmin(user)
          setAdmin(adminData)
        } else {
          setAdmin(null)
        }
      } catch (error) {
        console.error('Error fetching admin data:', error)
        setAdmin(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAdmin()
  }, [user])

  return { admin, loading, adminService }
}
