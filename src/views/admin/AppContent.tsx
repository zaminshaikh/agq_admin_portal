import { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CSpinner,
} from '@coreui/react-pro'
import { usePermissions } from '../../contexts/PermissionContext'
import catalog from '../../content/catalog.json'
import { ContentEntry, fieldLabel, location, sections } from '../../content/contentOrganization'
import {
  ContentSnapshot,
  loadAppContent,
  saveAppContent,
  updateAppImage,
} from '../../content/appContentService'
import './AppContent.css'

const defaults = Object.fromEntries(
  catalog.filter((entry) => entry.kind !== 'image').map((entry) => [entry.id, entry.defaultValue]),
)
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not update app content. Please try again.'

export default function AppContent() {
  const { isAdmin, loading: permissionLoading } = usePermissions()
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>(defaults)
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('signup')
  const [kind, setKind] = useState('all')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingImage, setPendingImage] = useState<{
    id: string
    file: File
    preview: string
  } | null>(null)
  const accept = (next: ContentSnapshot) => {
    setSnapshot(next)
    setDraft({ ...defaults, ...next.texts })
  }
  const reload = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      accept(await loadAppContent())
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (isAdmin) void reload()
  }, [isAdmin])
  useEffect(
    () => () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.preview)
    },
    [pendingImage],
  )
  const changes = useMemo(
    () =>
      Object.fromEntries(
        catalog
          .filter(
            (entry) =>
              entry.kind !== 'image' &&
              draft[entry.id] !== (snapshot?.texts[entry.id] ?? defaults[entry.id]),
          )
          .map((entry) => [entry.id, draft[entry.id]]),
      ),
    [draft, snapshot],
  )
  const changeCount = Object.keys(changes).length
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (changeCount || pendingImage) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changeCount, pendingImage])
  const searching = query.trim().length > 0
  const filtered = catalog.filter((entry) => {
    const place = location(entry)
    return (
      (searching || place.section === section) &&
      (kind === 'all' || (kind === 'images' ? entry.kind === 'image' : entry.kind !== 'image')) &&
      (!onlyChanged || Object.prototype.hasOwnProperty.call(changes, entry.id) || pendingImage?.id === entry.id) &&
      `${fieldLabel(entry)} ${entry.label} ${place.group} ${sections.find((item) => item.id === place.section)?.label} ${draft[entry.id] ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
  })
  const grouped = new Map<string, ContentEntry[]>()
  for (const entry of filtered) {
    const place = location(entry)
    const title = searching
      ? `${sections.find((item) => item.id === place.section)?.label} / ${place.group}`
      : place.group
    grouped.set(title, [...(grouped.get(title) || []), entry])
  }
  const selected = sections.find((item) => item.id === section)!
  const save = async () => {
    if (!snapshot || pendingImage) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      accept(await saveAppContent(snapshot.version, changes))
      setNotice('Changes published to the mobile app.')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  const publishImage = async (id: string, file?: File) => {
    if (!snapshot || changeCount) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      accept(await updateAppImage(snapshot.version, id, file))
      setPendingImage(null)
      setNotice(file ? 'Image published.' : 'Default image restored.')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  const chooseImage = (id: string, file?: File) => {
    if (!file) return
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Choose a PNG, JPEG, or WebP image up to 5 MB.')
      return
    }
    setError('')
    setPendingImage({ id, file, preview: URL.createObjectURL(file) })
  }
  const pickSection = (id: string) => {
    setSection(id)
    setQuery('')
    setKind('all')
    setOnlyChanged(false)
  }
  const editText = (id: string, value: string) =>
    setDraft((previous) => ({ ...previous, [id]: value }))
  if (permissionLoading) return <CSpinner />
  if (!isAdmin)
    return <CAlert color="warning">Administrator access is required to edit app content.</CAlert>
  return (
    <div className="app-content-editor">
      <h2>App content</h2>
      <p className="text-body-secondary">
        Choose a screen to edit its messages, labels, and images.
      </p>
      {error && (
        <CAlert color="danger" role="alert">
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert color="success" role="status">
          {notice}
        </CAlert>
      )}
      <div className="content-publish-bar">
        <div>
          <strong>
            {changeCount ? `${changeCount} unpublished changes` : 'Published content'}
          </strong>
          <div className="small text-body-secondary">
            Edits stay in your draft while you browse screens.
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <CButton
            color="secondary"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (
                (changeCount || pendingImage) &&
                !window.confirm('Discard your unpublished changes and reload the latest content?')
              )
                return
              setPendingImage(null)
              void reload()
            }}
          >
            Reload
          </CButton>
          <CButton
            disabled={
              busy || !snapshot || !!pendingImage || (changeCount === 0 && snapshot.version > 0)
            }
            onClick={save}
          >
            {busy ? 'Working…' : snapshot?.version === 0 ? 'Publish content' : 'Publish changes'}
          </CButton>
        </div>
      </div>
      {pendingImage && (
        <CAlert color="info" className="mt-3">
          <strong>
            Image preview ready:{' '}
            {fieldLabel(catalog.find((entry) => entry.id === pendingImage.id)!)}
          </strong>
          <p className="mb-2">Publish or cancel this image before editing text.</p>
          <div className="d-flex gap-2">
            <CButton
              disabled={busy}
              onClick={() => publishImage(pendingImage.id, pendingImage.file)}
            >
              Publish image
            </CButton>
            <CButton color="secondary" disabled={busy} onClick={() => setPendingImage(null)}>
              Cancel image
            </CButton>
          </div>
        </CAlert>
      )}
      {!snapshot && busy && (
        <div className="my-3">
          <CSpinner /> Loading content…
        </div>
      )}
      {snapshot?.version === 0 && (
        <CAlert color="info" className="mt-3">
          Publish once to make the default text and images available to the app.
        </CAlert>
      )}
      <CFormInput
        className="my-4"
        aria-label="Search all app content"
        placeholder="Search all screens, messages, people, or images…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="content-workspace">
        <nav className="content-screen-nav" aria-label="App screens">
          <div className="content-nav-title">APP SCREENS</div>
          {sections.map((item) => {
            const items = catalog.filter((entry) => location(entry).section === item.id)
            const edited = items.filter((entry) => Object.prototype.hasOwnProperty.call(changes, entry.id)).length
            return (
              <button
                type="button"
                key={item.id}
                className={`content-screen-button ${!searching && section === item.id ? 'selected' : ''}`}
                aria-current={!searching && section === item.id ? 'page' : undefined}
                onClick={() => pickSection(item.id)}
              >
                <span>{item.label}</span>
                <span className={edited ? 'content-count edited' : 'content-count'}>
                  {edited ? `${edited} edited` : items.length}
                </span>
              </button>
            )
          })}
        </nav>
        <main className="content-fields">
          <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
            <div>
              <h3 className="h4 mb-1">{searching ? 'Search results' : selected.label}</h3>
              <p className="text-body-secondary mb-0">
                {searching ? `${filtered.length} matches across all screens` : selected.description}
              </p>
            </div>
            <div className="d-flex align-items-start gap-2">
              <CFormSelect
                aria-label="Content type"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                <option value="all">Text & images</option>
                <option value="text">Text only</option>
                <option value="images">Images only</option>
              </CFormSelect>
              <CButton
                color="secondary"
                variant={onlyChanged ? undefined : 'outline'}
                className="text-nowrap"
                aria-pressed={onlyChanged}
                onClick={() => setOnlyChanged((value) => !value)}
              >
                Edited only
              </CButton>
            </div>
          </div>
          {!filtered.length && (
            <CCard>
              <CCardBody>
                <h4 className="h6">No matching content</h4>
                <p className="mb-2">Try another search or clear the filters.</p>
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => {
                    setQuery('')
                    setKind('all')
                    setOnlyChanged(false)
                  }}
                >
                  Clear filters
                </CButton>
              </CCardBody>
            </CCard>
          )}
          {[...grouped].map(([title, entries]) => (
            <details open key={`${section}/${title}`} className="content-group">
              <summary>
                <span>{title}</span>
                <span className="text-body-secondary small">{entries.length} items</span>
              </summary>
              <div className="content-group-body">
                {entries.map((entry) => {
                  const label = fieldLabel(entry)
                  const changed = Object.prototype.hasOwnProperty.call(changes, entry.id)
                  const value = draft[entry.id] ?? entry.defaultValue
                  const long =
                    value.length > 90 || value.includes('\n') || entry.id === 'signup.cid_help'
                  return (
                    <div key={entry.id} className={`content-field ${changed ? 'is-edited' : ''}`}>
                      <div className="d-flex gap-2 align-items-center mb-2">
                        <label htmlFor={`content-${entry.id}`} className="content-field-label">
                          {label}
                        </label>
                        {changed && <span className="content-edit-label">Edited</span>}
                      </div>
                      {entry.kind === 'image' ? (
                        <div className="content-image-row">
                          <img
                            alt={label}
                            src={
                              pendingImage?.id === entry.id
                                ? pendingImage.preview
                                : snapshot?.images[entry.id]?.url ??
                                  `/app-content/${entry.defaultValue.split('/').pop()}`
                            }
                            className={
                              entry.id.includes('headshot')
                                ? 'content-image portrait'
                                : 'content-image'
                            }
                          />
                          <div>
                            <CFormInput
                              id={`content-${entry.id}`}
                              aria-label={`Replace ${label}`}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={
                                busy || !snapshot?.version || changeCount > 0 || !!pendingImage
                              }
                              onChange={(event) => {
                                chooseImage(entry.id, event.target.files?.[0])
                                event.target.value = ''
                              }}
                            />
                            <p className="small text-body-secondary mt-2">
                              PNG, JPEG, or WebP · up to 5 MB
                              {changeCount > 0
                                ? '. Publish text changes before replacing an image.'
                                : ''}
                            </p>
                            <CButton
                              size="sm"
                              color="secondary"
                              variant="outline"
                              disabled={
                                busy || !snapshot?.version || changeCount > 0 || !!pendingImage
                              }
                              onClick={() => publishImage(entry.id)}
                            >
                              Restore default image
                            </CButton>
                          </div>
                        </div>
                      ) : (
                        <>
                          {long ? (
                            <CFormTextarea
                              id={`content-${entry.id}`}
                              rows={Math.min(12, Math.max(4, Math.ceil(value.length / 110)))}
                              value={value}
                              disabled={busy || !snapshot || !!pendingImage}
                              maxLength={12000}
                              onChange={(event) => editText(entry.id, event.target.value)}
                            />
                          ) : (
                            <CFormInput
                              id={`content-${entry.id}`}
                              value={value}
                              disabled={busy || !snapshot || !!pendingImage}
                              maxLength={12000}
                              onChange={(event) => editText(entry.id, event.target.value)}
                            />
                          )}
                          {entry.id === 'signup.cid_help' && (
                            <p className="small text-body-secondary mt-2 mb-0">
                              Shown when someone taps Client ID help during sign up. Edit the entire
                              message, including the contact email.
                            </p>
                          )}
                          {entry.placeholders.length > 0 && (
                            <p className="small text-body-secondary mt-2 mb-0">
                              The app fills in{' '}
                              {entry.placeholders.map((token) => `{${token}}`).join(', ')}. Keep
                              these values in your message.
                            </p>
                          )}
                          <details className="content-default">
                            <summary>Original wording</summary>
                            <p>{entry.defaultValue}</p>
                            <CButton
                              size="sm"
                              color="secondary"
                              variant="outline"
                              disabled={
                                busy || !snapshot || !!pendingImage || value === entry.defaultValue
                              }
                              onClick={() => editText(entry.id, entry.defaultValue)}
                            >
                              Restore this wording
                            </CButton>
                          </details>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          ))}
        </main>
      </div>
    </div>
  )
}
