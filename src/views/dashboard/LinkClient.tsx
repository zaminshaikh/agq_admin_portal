import {
  CAlert,
  CButton,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CLoadingButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CMultiSelect,
  CSpinner,
} from '@coreui/react-pro'
import type { Option } from '@coreui/react-pro/dist/esm/components/multi-select/types'
import { useEffect, useMemo, useState } from 'react'
import { Client, DatabaseService } from 'src/db/database'
import { usePermissions } from '../../contexts/PermissionContext'
import { AuthUserSummary } from '../../db/adminService'

interface LinkClientProps {
  showModal: boolean
  setShowModal: (show: boolean) => void
  client?: Client
  setClients: (clients: Client[]) => void
}

const buildUidLabel = (u: AuthUserSummary): string => {
  const email = u.email || 'no email'
  const name = u.displayName ? ` · ${u.displayName}` : ''
  return `${email}${name} — ${u.uid}`
}

export const LinkClient: React.FC<LinkClientProps> = ({
  showModal,
  setShowModal,
  client,
  setClients,
}) => {
  const { adminService, admin } = usePermissions()

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [unlinkedUsers, setUnlinkedUsers] = useState<AuthUserSummary[]>([])
  const [selectedUid, setSelectedUid] = useState('')
  const [manualUid, setManualUid] = useState('')
  const [error, setError] = useState('')
  const [isLinking, setIsLinking] = useState(false)
  const [selectKey, setSelectKey] = useState(0)

  const loadUnlinkedUsers = async () => {
    try {
      setLoadingUsers(true)
      setError('')
      const { users } = await adminService.listAuthUsers()
      const unlinked = users.filter((u) => !u.linkedCid && !u.isAdmin)
      unlinked.sort((a, b) => {
        const ae = (a.email || '').toLowerCase()
        const be = (b.email || '').toLowerCase()
        return ae.localeCompare(be)
      })
      setUnlinkedUsers(unlinked)
    } catch (err: any) {
      console.error('Error loading unlinked auth users:', err)
      setError(err?.message || 'Failed to load Firebase Auth users')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (showModal) {
      setSelectedUid('')
      setManualUid('')
      setError('')
      setSelectKey((k) => k + 1)
      loadUnlinkedUsers()
    }
  }, [showModal])

  const baseOptions = useMemo<Option[]>(
    () =>
      unlinkedUsers.map((u) => ({
        value: u.uid,
        label: buildUidLabel(u),
      })),
    [unlinkedUsers],
  )

  const options = useMemo<Option[]>(
    () =>
      baseOptions.map((opt) => ({
        ...opt,
        selected: opt.value === selectedUid,
      })),
    [baseOptions, selectedUid],
  )

  const linkClient = async () => {
    if (!client?.cid) {
      setError('Missing client information.')
      return
    }
    const uid = (manualUid.trim() || selectedUid).trim()
    if (!uid) {
      setError('Please choose a Firebase user or enter a UID.')
      return
    }

    setIsLinking(true)
    setError('')
    try {
      await adminService.linkAuthUserToClient(uid, client.cid)
      const service = new DatabaseService()
      if (admin) service.setCurrentAdmin(admin)
      const updatedClients = await service.getClients()
      setClients(updatedClients)
      setShowModal(false)
    } catch (err: any) {
      console.error('Error linking client:', err)
      const message =
        err?.message?.replace(/^FirebaseError:\s*/, '') ||
        'Failed to link this UID to the client.'
      setError(message)
    } finally {
      setIsLinking(false)
    }
  }

  const alreadyLinked = !!client?.uid && client.uid !== ''

  return (
    <CModal
      scrollable
      alignment="center"
      visible={showModal}
      backdrop="static"
      size="lg"
      onClose={() => (isLinking ? undefined : setShowModal(false))}
    >
      <CModalHeader>
        <CModalTitle>Link Firebase User to Client</CModalTitle>
      </CModalHeader>
      <CModalBody className="px-4">
        <p className="mb-3">
          Link a Firebase Auth account to{' '}
          <strong>
            {client?.firstName} {client?.lastName}
          </strong>{' '}
          (CID {client?.cid}). This will set the client&rsquo;s UID and email and finish the
          sign-up flow that the mobile app was supposed to complete.
        </p>

        {alreadyLinked && (
          <CAlert color="warning">
            This client is already linked to UID <code>{client?.uid}</code>. Unlink them
            first if you need to attach a different account.
          </CAlert>
        )}
        {error && <CAlert color="danger">{error}</CAlert>}

        <CInputGroup className="mb-2">
          <CInputGroupText>Client</CInputGroupText>
          <CFormInput
            value={`${client?.firstName ?? ''} ${client?.lastName ?? ''} (${client?.cid ?? ''})`}
            disabled
          />
        </CInputGroup>
        <CInputGroup className="mb-3">
          <CInputGroupText>Client Email</CInputGroupText>
          <CFormInput value={client?.initEmail || ''} disabled />
        </CInputGroup>

        <hr />

        <div className="mb-3">
          <label className="form-label fw-semibold mb-1">
            Search and select an unlinked Firebase user
          </label>
          {loadingUsers ? (
            <div className="text-center py-3">
              <CSpinner color="primary" size="sm" />
              <span className="ms-2 text-muted">Loading Firebase Auth users…</span>
            </div>
          ) : (
            <CMultiSelect
              key={selectKey}
              options={options}
              multiple={false}
              cleaner
              search
              virtualScroller
              placeholder="Type an email or UID to search..."
              searchNoResultsLabel={
                unlinkedUsers.length === 0
                  ? 'No unlinked Firebase users found'
                  : 'No matching users'
              }
              disabled={isLinking || alreadyLinked}
              onChange={(selected) => {
                const value = (selected[0]?.value as string | undefined) ?? ''
                setSelectedUid(value)
                if (value) setManualUid('')
              }}
            />
          )}
          <small className="text-muted">
            Showing {unlinkedUsers.length} Firebase Auth account
            {unlinkedUsers.length === 1 ? '' : 's'} without a linked client.
          </small>
        </div>

        <div className="mb-1">
          <label className="form-label fw-semibold mb-1">Or enter a UID manually</label>
          <CFormInput
            value={manualUid}
            placeholder="Firebase Auth UID"
            onChange={(e) => {
              setManualUid(e.target.value)
              if (e.target.value) setSelectedUid('')
            }}
            disabled={isLinking || alreadyLinked}
          />
          <small className="text-muted">
            Overrides the dropdown when filled. Useful when the UID is known but not in
            the unlinked list.
          </small>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          onClick={() => setShowModal(false)}
          disabled={isLinking}
        >
          Cancel
        </CButton>
        <CLoadingButton
          color="primary"
          loading={isLinking}
          onClick={linkClient}
          disabled={alreadyLinked || (!selectedUid && !manualUid.trim())}
        >
          Link Account
        </CLoadingButton>
      </CModalFooter>
    </CModal>
  )
}
