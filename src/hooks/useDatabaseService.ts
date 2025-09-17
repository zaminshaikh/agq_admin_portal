import { useEffect, useRef } from 'react'
import { DatabaseService } from '../db/database'
import { usePermissions } from '../contexts/PermissionContext'

/**
 * Custom hook that provides a DatabaseService instance with current admin properly set for audit trail
 * 
 * @returns DatabaseService instance with current admin initialized
 */
export const useDatabaseService = (): DatabaseService => {
    const { admin } = usePermissions()
    const dbRef = useRef<DatabaseService | null>(null)

    // Create the database service instance once
    if (!dbRef.current) {
        dbRef.current = new DatabaseService()
    }

    // Update the admin whenever it changes
    useEffect(() => {
        if (dbRef.current && admin) {
            dbRef.current.setCurrentAdmin(admin)
        }
    }, [admin])

    return dbRef.current
}
