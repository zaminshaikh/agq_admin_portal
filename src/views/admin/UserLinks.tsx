import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CLoadingButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CMultiSelect,
  CRow,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro'
import type { Option } from '@coreui/react-pro/dist/esm/components/multi-select/types'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilLinkAlt, cilXCircle } from '@coreui/icons'
import { collection, getDocs, getFirestore } from 'firebase/firestore'
import { app } from '../../App'
import config from '../../../config.json'
import { usePermissions } from '../../contexts/PermissionContext'
import { AuthUserSummary, UnlinkedClientSummary } from '../../db/adminService'

type FilterMode = 'all' | 'unlinked' | 'linked' | 'admins'

const parseTimestamp = (value: string | null): number => {
  if (!value) return 0
  const t = new Date(value).getTime()
  return isNaN(t) ? 0 : t
}

const formatTimestamp = (value: number): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const buildClientLabel = (c: UnlinkedClientSummary): string => {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || 'Unnamed'
  const emailPart = c.email ? ` (${c.email})` : ''
  return `${name} — ${c.cid}${emailPart}`
}

const UserLinks: React.FC = () => {
  const { isAdmin, loading: permissionLoading, adminService } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AuthUserSummary[]>([])
  const [unlinkedClients, setUnlinkedClients] = useState<UnlinkedClientSummary[]>([])
  const [filter, setFilter] = useState<FilterMode>('unlinked')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showLinkModal, setShowLinkModal] = useState(false)
  const [activeUser, setActiveUser] = useState<AuthUserSummary | null>(null)
  const [selectedCid, setSelectedCid] = useState('')
  const [manualCid, setManualCid] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [selectKey, setSelectKey] = useState(0)

  const fetchUnlinkedClientsDirect = async (): Promise<UnlinkedClientSummary[]> => {
    const db = getFirestore(app)
    const snap = await getDocs(collection(db, config.FIRESTORE_ACTIVE_USERS_COLLECTION))
    const out: UnlinkedClientSummary[] = []
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {}
      const uid = (data.uid as string | undefined) ?? ''
      if (uid && uid !== '') return
      out.push({
        cid: docSnap.id,
        firstName: data?.name?.first ?? '',
        lastName: data?.name?.last ?? '',
        companyName: data?.name?.company ?? '',
        email: data?.initEmail ?? data?.email ?? '',
      })
    })
    out.sort((a, b) => {
      const an = `${a.firstName} ${a.lastName} ${a.companyName}`.toLowerCase()
      const bn = `${b.firstName} ${b.lastName} ${b.companyName}`.toLowerCase()
      return an.localeCompare(bn)
    })
    return out
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      // Run auth-user lookup and the unlinked-client read in parallel. We pull
      // the client list directly from Firestore so the page works even before
      // the cloud function is updated to include `unlinkedClients` in its
      // response (and to avoid waiting on the function's listUsers pagination).
      const [authResult, directClients] = await Promise.all([
        adminService.listAuthUsers(),
        fetchUnlinkedClientsDirect(),
      ])
      setUsers(authResult.users)
      setUnlinkedClients(
        authResult.unlinkedClients.length > 0 ? authResult.unlinkedClients : directClients,
      )
    } catch (err: any) {
      console.error('Error loading user links data:', err)
      setError(err?.message || 'Failed to load Firebase Auth users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  const filteredUsers = useMemo(() => {
    switch (filter) {
      case 'unlinked':
        return users.filter((u) => !u.linkedCid && !u.isAdmin)
      case 'linked':
        return users.filter((u) => !!u.linkedCid)
      case 'admins':
        return users.filter((u) => u.isAdmin)
      case 'all':
      default:
        return users
    }
  }, [users, filter])

  const baseClientOptions = useMemo<Option[]>(
    () =>
      unlinkedClients.map((c) => ({
        value: c.cid,
        label: buildClientLabel(c),
      })),
    [unlinkedClients],
  )

  const clientOptions = useMemo<Option[]>(
    () =>
      baseClientOptions.map((opt) => ({
        ...opt,
        selected: opt.value === selectedCid,
      })),
    [baseClientOptions, selectedCid],
  )

  const handleOpenLinkModal = (user: AuthUserSummary) => {
    setActiveUser(user)
    setSelectedCid('')
    setManualCid('')
    setModalError('')
    setShowLinkModal(true)
    setSelectKey((k) => k + 1)
  }

  const handleConfirmLink = async () => {
    if (!activeUser) return
    const cid = (manualCid.trim() || selectedCid).trim()
    if (!cid) {
      setModalError('Please select a client or enter a client ID.')
      return
    }

    setLinkLoading(true)
    setModalError('')
    try {
      await adminService.linkAuthUserToClient(activeUser.uid, cid)
      setSuccess(`Linked UID ${activeUser.uid} to client ${cid}.`)
      setShowLinkModal(false)
      setActiveUser(null)
      await loadData()
    } catch (err: any) {
      console.error('Error linking user:', err)
      const message =
        err?.message?.replace(/^FirebaseError:\s*/, '') ||
        'Failed to link this UID to that client.'
      setModalError(message)
    } finally {
      setLinkLoading(false)
    }
  }

  if (permissionLoading) {
    return (
      <div className="text-center mt-5">
        <CSpinner color="primary" />
        <p className="mt-3 text-muted">Loading...</p>
      </div>
    )
  }

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

  const columns = [
    { key: 'status', label: 'Status', _style: { width: '10%' }, filter: false, sorter: false },
    { key: 'uid', label: 'Firebase UID', _style: { width: '22%' } },
    { key: 'email', label: 'Email' },
    { key: 'providers', label: 'Providers', _style: { width: '10%' }, filter: false },
    { key: 'creationTime', label: 'Created', _style: { width: '12%' }, filter: false },
    { key: 'lastSignInTime', label: 'Last Sign-In', _style: { width: '12%' }, filter: false },
    { key: 'actions', label: '', _style: { width: '10%' }, filter: false, sorter: false },
  ]

  const items = filteredUsers.map((u) => ({
    ...u,
    _linkedLabel: u.linkedClientName || '',
    creationTime: parseTimestamp(u.creationTime),
    lastSignInTime: parseTimestamp(u.lastSignInTime),
  }))

  const activeUserLinked = !!activeUser?.linkedCid

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h4 className="mb-0">User Links</h4>
                <small className="text-muted">
                  Firebase Auth users and their link status with client records. Use this to
                  manually complete a link when the mobile app&rsquo;s sign-up call failed.
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <CFormSelect
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterMode)}
                  style={{ minWidth: '180px' }}
                >
                  <option value="unlinked">Unlinked only</option>
                  <option value="linked">Linked clients</option>
                  <option value="admins">Admins</option>
                  <option value="all">All users</option>
                </CFormSelect>
                <CButton color="secondary" variant="outline" onClick={loadData} disabled={loading}>
                  Refresh
                </CButton>
              </div>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            {success && (
              <CAlert color="success" dismissible onClose={() => setSuccess('')}>
                {success}
              </CAlert>
            )}

            {loading ? (
              <div className="text-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : (
              <CSmartTable
                activePage={1}
                cleaner
                columns={columns}
                columnFilter
                columnSorter
                items={items}
                itemsPerPage={25}
                itemsPerPageSelect
                pagination
                sorterValue={{ column: 'creationTime', state: 'desc' }}
                scopedColumns={{
                  status: (item: AuthUserSummary) => (
                    <td>
                      {item.isAdmin ? (
                        <CBadge color="info">Admin</CBadge>
                      ) : item.linkedCid ? (
                        <CBadge color="success">
                          <CIcon icon={cilCheckCircle} className="me-1" />
                          Linked
                        </CBadge>
                      ) : (
                        <CBadge color="warning">
                          <CIcon icon={cilXCircle} className="me-1" />
                          Unlinked
                        </CBadge>
                      )}
                    </td>
                  ),
                  uid: (item: AuthUserSummary) => (
                    <td>
                      <code style={{ fontSize: '0.85em' }}>{item.uid}</code>
                      {item.linkedCid && (
                        <div>
                          <small className="text-muted">
                            Client {item.linkedCid}
                            {item.linkedClientName ? ` · ${item.linkedClientName}` : ''}
                          </small>
                        </div>
                      )}
                    </td>
                  ),
                  email: (item: AuthUserSummary) => (
                    <td>
                      {item.email || <span className="text-muted">No email</span>}
                      {item.displayName && (
                        <div>
                          <small className="text-muted">{item.displayName}</small>
                        </div>
                      )}
                    </td>
                  ),
                  providers: (item: AuthUserSummary) => (
                    <td>
                      {item.providerIds.length === 0
                        ? '-'
                        : item.providerIds.join(', ')}
                    </td>
                  ),
                  creationTime: (item: AuthUserSummary & { creationTime: number }) => (
                    <td>
                      <small>{formatTimestamp(item.creationTime)}</small>
                    </td>
                  ),
                  lastSignInTime: (item: AuthUserSummary & { lastSignInTime: number }) => (
                    <td>
                      <small>{formatTimestamp(item.lastSignInTime)}</small>
                    </td>
                  ),
                  actions: (item: AuthUserSummary) => (
                    <td>
                      <CButton
                        color="primary"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenLinkModal(item)}
                        disabled={!!item.linkedCid || item.isAdmin}
                        title={
                          item.isAdmin
                            ? 'This UID belongs to an admin account'
                            : item.linkedCid
                              ? 'Already linked'
                              : 'Link this UID to a client'
                        }
                      >
                        <CIcon icon={cilLinkAlt} className="me-1" />
                        Link
                      </CButton>
                    </td>
                  ),
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        visible={showLinkModal}
        onClose={() => (linkLoading ? undefined : setShowLinkModal(false))}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Link Firebase UID to Client</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {modalError && <CAlert color="danger">{modalError}</CAlert>}

          {activeUser && (
            <>
              <CInputGroup className="mb-2">
                <CInputGroupText>UID</CInputGroupText>
                <CFormInput value={activeUser.uid} disabled />
              </CInputGroup>
              <CInputGroup className="mb-2">
                <CInputGroupText>Email</CInputGroupText>
                <CFormInput value={activeUser.email ?? ''} disabled />
              </CInputGroup>
              {activeUserLinked && (
                <CAlert color="warning">
                  This UID is already linked to client {activeUser.linkedCid}.
                </CAlert>
              )}
            </>
          )}

          <hr />

          <div className="mb-3">
            <label className="form-label fw-semibold mb-1">
              Search and select an unlinked client
            </label>
            <CMultiSelect
              key={selectKey}
              options={clientOptions}
              multiple={false}
              cleaner
              search
              virtualScroller
              placeholder="Type a name, email, or CID to search..."
              searchNoResultsLabel="No matching clients"
              disabled={linkLoading}
              onChange={(selected) => {
                const value = (selected[0]?.value as string | undefined) ?? ''
                setSelectedCid(value)
                if (value) setManualCid('')
              }}
            />
            <small className="text-muted">
              Showing {clientOptions.length} client record
              {clientOptions.length === 1 ? '' : 's'} without a linked UID.
            </small>
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold mb-1">
              Or enter a client ID manually
            </label>
            <CFormInput
              value={manualCid}
              placeholder="e.g. 12345678"
              onChange={(e) => {
                setManualCid(e.target.value)
                if (e.target.value) setSelectedCid('')
              }}
              disabled={linkLoading}
            />
            <small className="text-muted">
              Overrides the dropdown when filled. The CID must match an existing client
              document.
            </small>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setShowLinkModal(false)}
            disabled={linkLoading}
          >
            Cancel
          </CButton>
          <CLoadingButton
            color="primary"
            loading={linkLoading}
            onClick={handleConfirmLink}
            disabled={!activeUser || activeUserLinked}
          >
            <CIcon icon={cilLinkAlt} className="me-1" />
            Link Account
          </CLoadingButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default UserLinks
