import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTableBody,
  CTableDataCell,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
  CFormInput,
  CFormSelect,
  CAlert,
  CBadge,
  CSpinner,
} from '@coreui/react-pro'
import { useCurrentAdmin, Admin, AdminPermission } from '../../db/adminService'
import { usePermissions } from '../../contexts/PermissionContext'

const AdminManagement: React.FC = () => {
  const { admin: currentAdmin, adminService } = useCurrentAdmin()
  const { isAdmin, loading: permissionLoading } = usePermissions()
  const [admins, setAdmins] = useState<(Admin & { permissions: AdminPermission })[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<(Admin & { permissions: AdminPermission }) | null>(null)
  const [formData, setFormData] = useState({
    permissions: 'none' as AdminPermission
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const adminsList = await adminService.getAllAdmins()
      setAdmins(adminsList)
    } catch (error) {
      console.error('Error loading admins:', error)
      setError('Failed to load admins')
    } finally {
      setLoading(false)
    }
  }

  const handleEditAdmin = (admin: Admin & { permissions: AdminPermission }) => {
    setEditingAdmin(admin)
    setFormData({
      permissions: admin.permissions
    })
    setShowModal(true)
    setError('')
    setSuccess('')
  }


  const handleSaveAdmin = async () => {
    try {
      if (!currentAdmin) {
        setError('You must be logged in as an admin')
        return
      }

      if (!formData.permissions) {
        setError('Please select permissions')
        return
      }

      if (editingAdmin) {
        await adminService.updateAdminPermissions(editingAdmin.id, formData.permissions)
        setSuccess('Admin permissions updated successfully')
      } else {
        setError('Creating new admins is done through the signup page')
        return
      }

      setShowModal(false)
      loadAdmins()
    } catch (error) {
      console.error('Error saving admin:', error)
      setError('Failed to save admin')
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (!currentAdmin) {
      setError('You must be logged in as an admin')
      return
    }

    if (adminId === currentAdmin.id) {
      setError('You cannot delete yourself')
      return
    }

    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {
        await adminService.deleteAdmin(adminId)
        setSuccess('Admin deleted successfully')
        loadAdmins()
      } catch (error) {
        console.error('Error deleting admin:', error)
        setError('Failed to delete admin')
      }
    }
  }

  const getPermissionBadges = (permissions: string) => {
    const getColor = (perm: string) => {
      switch (perm) {
        case 'admin': return 'danger'
        case 'write': return 'warning'
        case 'read': return 'info'
        case 'none': return 'secondary'
        default: return 'secondary'
      }
    }

    return (
      <CBadge
        color={getColor(permissions)}
        className="me-1"
      >
        {permissions.charAt(0).toUpperCase() + permissions.slice(1)}
      </CBadge>
    )
  }

  // Show loading spinner while permissions are being checked
  if (permissionLoading) {
    return (
      <div className="text-center mt-5">
        <CSpinner color="primary" />
        <p className="mt-3 text-muted">Loading admin panel...</p>
      </div>
    )
  }

  // Check if current user has admin permissions
  if (!isAdmin) {
    return (
      <CRow>
        <CCol xs={12}>
          <CAlert color="danger">
            <h4>Access Denied</h4>
            <p>You need admin permissions to access this page.</p>
          </CAlert>
        </CCol>
      </CRow>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <h4>Admin Management</h4>
              <div>
                <small className="text-muted">
                  New admins can create accounts at <strong>/admin-signup</strong>
                </small>
              </div>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

            {loading ? (
              <div className="text-center">
                <CSpinner color="primary" />
              </div>
            ) : (
              <CTable striped hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Permissions</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Last Updated</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {admins.map((admin) => (
                    <CTableRow key={admin.id}>
                      <CTableDataCell>{admin.name}</CTableDataCell>
                      <CTableDataCell>{admin.email}</CTableDataCell>
                      <CTableDataCell>{getPermissionBadges(admin.permissions)}</CTableDataCell>
                      <CTableDataCell>
                        {admin.createdAt?.toLocaleDateString()}
                        <br />
                        <small className="text-muted">by {admin.updatedBy}</small>
                      </CTableDataCell>
                      <CTableDataCell>
                        {admin.updatedAt?.toLocaleDateString()}
                        <br />
                        <small className="text-muted">by {admin.updatedBy}</small>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="warning"
                          variant="outline"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEditAdmin(admin)}
                        >
                          Edit
                        </CButton>
                        <CButton
                          color="danger"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.id)}
                          disabled={admin.id === currentAdmin?.id}
                        >
                          Delete
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Edit Admin Permissions Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Edit Admin Permissions</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {error && <CAlert color="danger">{error}</CAlert>}
          
          {editingAdmin && (
            <>
              <CInputGroup className="mb-3">
                <CInputGroupText>Name</CInputGroupText>
                <CFormInput value={editingAdmin.name} disabled />
              </CInputGroup>

              <CInputGroup className="mb-3">
                <CInputGroupText>Email</CInputGroupText>
                <CFormInput value={editingAdmin.email} disabled />
              </CInputGroup>
            </>
          )}

          <CInputGroup className="mb-3">
            <CInputGroupText>Permissions</CInputGroupText>
            <CFormSelect
              value={formData.permissions}
              onChange={(e) => setFormData({ 
                ...formData, 
                permissions: e.target.value as ('read' | 'write' | 'admin') 
              })}
            >
              <option value="none">None (No Access)</option>
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="admin">Admin</option>
            </CFormSelect>
          </CInputGroup>

          <div className="mt-3">
            <small className="text-muted">
              <strong>Permissions:</strong><br />
              • <strong>None:</strong> No access to the portal<br />
              • <strong>Read:</strong> Can view data but cannot make changes<br />
              • <strong>Write:</strong> Can create and edit data (includes read permissions)<br />
              • <strong>Admin:</strong> Full access including user management (includes all permissions)
            </small>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveAdmin}>
            Update Permissions
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default AdminManagement
