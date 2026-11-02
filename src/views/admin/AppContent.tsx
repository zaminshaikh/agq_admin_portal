import { useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CFormInput, CFormSelect, CFormTextarea, CRow, CSpinner } from '@coreui/react-pro'
import { usePermissions } from '../../contexts/PermissionContext'
import catalog from '../../content/catalog.json'
import { ContentSnapshot, loadAppContent, saveAppContent, updateAppImage } from '../../content/appContentService'

const defaults = Object.fromEntries(catalog.filter(entry => entry.kind !== 'image').map(entry => [entry.id, entry.defaultValue]))
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Could not update app content. Please try again.'
const pageSize = 20

export default function AppContent() {
  const { isAdmin, loading: permissionLoading } = usePermissions()
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>(defaults)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingImage, setPendingImage] = useState<{ id: string; file: File; preview: string } | null>(null)

  const accept = (next: ContentSnapshot) => { setSnapshot(next); setDraft({ ...defaults, ...next.texts }) }
  const reload = async () => {
    setBusy(true); setError(''); setNotice('')
    try { accept(await loadAppContent()) } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  useEffect(() => { if (isAdmin) void reload() }, [isAdmin])
  useEffect(() => () => { if (pendingImage) URL.revokeObjectURL(pendingImage.preview) }, [pendingImage])
  const changes = useMemo(() => Object.fromEntries(Object.entries(draft).filter(([id, value]) => value !== (snapshot?.texts[id] ?? defaults[id]))), [draft, snapshot])
  const changeCount = Object.keys(changes).length
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (changeCount || pendingImage) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changeCount, pendingImage])
  const groups = [...new Set(catalog.map(entry => entry.group))].sort()
  const filtered = catalog.filter(entry => (!group || entry.group === group) && `${entry.label} ${entry.group} ${draft[entry.id] ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const save = async () => {
    if (!snapshot) return
    setBusy(true); setError(''); setNotice('')
    try { accept(await saveAppContent(snapshot.version, changes)); setNotice('Content published. Connected apps will receive the update.') }
    catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const publishImage = async (id: string, file?: File) => {
    if (!snapshot) return
    setBusy(true); setError(''); setNotice('')
    try { accept(await updateAppImage(snapshot.version, id, file)); setPendingImage(null); setNotice(file ? 'Image published.' : 'Default image restored.') }
    catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const chooseImage = (id: string, file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a PNG, JPEG, or WebP image up to 5 MB.'); return
    }
    setError(''); setPendingImage({ id, file, preview: URL.createObjectURL(file) })
  }

  if (permissionLoading) return <CSpinner />
  if (!isAdmin) return <CAlert color="warning">Administrator access is required to edit app content.</CAlert>
  return <>
    <h2>App content</h2>
    <p>Edit the mobile app’s text, contact details, photos, and artwork. Current wording and images are available as defaults.</p>
    {error && <CAlert color="danger">{error}</CAlert>}
    {notice && <CAlert color="success">{notice}</CAlert>}
    {!snapshot && busy && <CSpinner />}
    {snapshot?.version === 0 && <CAlert color="info">Publish content once to store the defaults and images for the app. You can edit them before publishing.</CAlert>}
    <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
      <CButton disabled={busy || !snapshot || (changeCount === 0 && snapshot.version > 0)} onClick={save}>{busy ? 'Working…' : snapshot?.version === 0 ? 'Publish content' : `Publish changes (${changeCount})`}</CButton>
      <CButton color="secondary" variant="outline" disabled={busy} onClick={() => {
        if ((changeCount || pendingImage) && !window.confirm('Discard your unpublished changes and reload the latest content?')) return
        setPendingImage(null); void reload()
      }}>Reload latest</CButton>
      {changeCount > 0 && <span>{changeCount} unpublished text changes</span>}
    </div>
    <CRow className="mb-4 g-3">
      <CCol md={7}><CFormInput aria-label="Search app content" placeholder="Search wording, screens, or images" value={query} onChange={e => { setQuery(e.target.value); setPage(0) }} /></CCol>
      <CCol md={5}><CFormSelect aria-label="Screen or content group" value={group} onChange={e => { setGroup(e.target.value); setPage(0) }}><option value="">All screens and images</option>{groups.map(value => <option key={value}>{value}</option>)}</CFormSelect></CCol>
    </CRow>
    <p>{filtered.length} settings</p>
    {visible.map(entry => <CCard className="mb-3" key={entry.id}>
      <CCardHeader><strong>{entry.label}</strong><div className="small text-body-secondary">{entry.group}</div></CCardHeader>
      <CCardBody>
        {entry.kind === 'image' ? <>
          <img alt={entry.label} src={pendingImage?.id === entry.id ? pendingImage.preview : snapshot?.images[entry.id]?.url ?? `/app-content/${entry.defaultValue.split('/').pop()}`} style={{ maxWidth: '100%', width: 240, height: 160, objectFit: 'contain', background: '#dce2e9', borderRadius: 8 }} />
          <CFormInput className="my-3" aria-label={`Replace ${entry.label}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !snapshot?.version || changeCount > 0} onChange={event => { chooseImage(entry.id, event.target.files?.[0]); event.target.value = '' }} />
          <p className="small text-body-secondary">PNG, JPEG, or WebP, up to 5 MB. Save text changes before publishing an image.</p>
          <div className="d-flex gap-2">
            {pendingImage?.id === entry.id && <><CButton disabled={busy} onClick={() => publishImage(entry.id, pendingImage.file)}>Publish image</CButton><CButton color="secondary" disabled={busy} onClick={() => setPendingImage(null)}>Cancel</CButton></>}
            <CButton color="secondary" variant="outline" disabled={busy || !snapshot?.version || changeCount > 0} onClick={() => publishImage(entry.id)}>Restore default image</CButton>
          </div>
        </> : <>
          <CFormTextarea aria-label={entry.label} rows={entry.defaultValue.length > 150 ? 5 : 2} value={draft[entry.id] ?? entry.defaultValue} disabled={busy || !snapshot} maxLength={12000} onChange={event => setDraft(previous => ({ ...previous, [entry.id]: event.target.value }))} />
          {entry.placeholders.length > 0 && <p className="small mt-2">Keep these placeholders; the app fills them in: {entry.placeholders.map(value => `{${value}}`).join(', ')}</p>}
          <details className="mt-2"><summary>Default wording</summary><p style={{ whiteSpace: 'pre-wrap' }}>{entry.defaultValue}</p></details>
          <CButton className="mt-2" size="sm" color="secondary" variant="outline" disabled={busy || !snapshot || draft[entry.id] === entry.defaultValue} onClick={() => setDraft(previous => ({ ...previous, [entry.id]: entry.defaultValue }))}>Use default wording</CButton>
        </>}
      </CCardBody>
    </CCard>)}
    <div className="d-flex gap-3 align-items-center mb-4"><CButton color="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</CButton><span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</span><CButton color="secondary" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage(page + 1)}>Next</CButton></div>
  </>
}
