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
import { useCurrentAdmin, Admin } from '../../db/adminService'
import { usePermissions } from '../../contexts/PermissionContext'

const AdminManagement: React.FC = () => {
  const { admin: currentAdmin, adminService } = useCurrentAdmin()
  const { isAdmin, loading: permissionLoading } = usePermissions()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    permissions: 'read' as ('read' | 'write' | 'admin')
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

  const handleCreateAdmin = () => {
    setEditingAdmin(null)
    setFormData({ name: '', email: '', permissions: 'read' })
    setShowModal(true)
    setError('')
    setSuccess('')
  }

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setFormData({
      name: admin.name,
      email: admin.email,
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

      if (!formData.name || !formData.email || !formData.permissions) {
        setError('Please fill in all fields')
        return
      }

      if (editingAdmin) {
        await adminService.updateAdmin(editingAdmin.id, {
          name: formData.name,
          email: formData.email,
          permissions: formData.permissions
        }, currentAdmin)
        setSuccess('Admin updated successfully')
      } else {
        await adminService.createAdmin({
          name: formData.name,
          email: formData.email,
          permissions: formData.permissions
        }, currentAdmin)
        setSuccess('Admin created successfully')
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
    return (
      <CBadge
        color={permissions === 'admin' ? 'danger' : permissions === 'write' ? 'warning' : 'info'}
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
              <CButton color="primary" onClick={handleCreateAdmin}>
                Add New Admin
              </CButton>
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

      {/* Create/Edit Admin Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{editingAdmin ? 'Edit Admin' : 'Create New Admin'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {error && <CAlert color="danger">{error}</CAlert>}
          
          <CInputGroup className="mb-3">
            <CInputGroupText>Name</CInputGroupText>
            <CFormInput
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter admin name"
            />
          </CInputGroup>

          <CInputGroup className="mb-3">
            <CInputGroupText>Email</CInputGroupText>
            <CFormInput
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter admin email"
            />
          </CInputGroup>

          <CInputGroup className="mb-3">
            <CInputGroupText>Permissions</CInputGroupText>
            <CFormSelect
              value={formData.permissions}
              onChange={(e) => setFormData({ 
                ...formData, 
                permissions: e.target.value as ('read' | 'write' | 'admin') 
              })}
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="admin">Admin</option>
            </CFormSelect>
          </CInputGroup>

          <div className="mt-3">
            <small className="text-muted">
              <strong>Permissions:</strong><br />
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
            {editingAdmin ? 'Update' : 'Create'} Admin
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default AdminManagement
