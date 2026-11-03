import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CSpinner,
} from '@coreui/react-pro'
import { CChartLine } from '@coreui/react-chartjs'
import { selectAumRange } from './aumRange'
import { cachedAum, loadAum, refreshAum, History, Reconciliation } from './aumData'
import { subscribeAumChanges } from '../../db/aumChanges'
import './AumChart.css'

type View = 'combined' | 'AGQ' | 'AK1'
const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
const today = () => new Date().toISOString().slice(0, 10)

export default function AumChart({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const [history, setHistory] = useState<History | null>(() => cachedAum<History>('getAumHistory'))
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(() =>
    cachedAum<Reconciliation>('getAumReconciliation'),
  )
  const [reconciliationLoading, setReconciliationLoading] = useState(true)
  const [reconciliationError, setReconciliationError] = useState('')
  const changeTimer = useRef<ReturnType<typeof setTimeout>>()
  const previousRevision = useRef(refreshVersion)
  const [view, setView] = useState<View>('combined')
  const [start, setStart] = useState(() => history?.points[0]?.date || '')
  const [end, setEnd] = useState(today)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const unsubscribe = subscribeAumChanges(() => {
      clearTimeout(changeTimer.current)
      changeTimer.current = setTimeout(() => {
        refreshAum()
        setRefresh((value) => value + 1)
      }, 300)
    })
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAum()
        setRefresh((value) => value + 1)
      }
    }, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setRefresh((value) => value + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      clearTimeout(changeTimer.current)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  useEffect(() => {
    let active = true
    if (previousRevision.current !== refreshVersion) {
      clearTimeout(changeTimer.current)
      previousRevision.current = refreshVersion
      refreshAum()
    }
    setLoading(true)
    loadAum<History>('getAumHistory')
      .then((data) => {
        if (!active) return
        setError('')
        setHistory((previous) => ({
          ...data,
          points:
            previous && JSON.stringify(previous.points) === JSON.stringify(data.points)
              ? previous.points
              : data.points,
        }))
        setStart((value) => value || data.points[0]?.date || today())
      })
      .catch(() => {
        if (active)
          setError(
            'Could not load the latest AUM history. Any displayed values are from the last successful load. Please retry.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    setReconciliationLoading(true)
    loadAum<Reconciliation>('getAumReconciliation')
      .then((data) => {
        if (active) {
          setReconciliationError('')
          setReconciliation(data)
        }
      })
      .catch(() => {
        if (active)
          setReconciliationError(
            'Could not refresh balance reconciliation. Any displayed results are from the last successful check. Refresh to retry.',
          )
      })
      .finally(() => {
        if (active) setReconciliationLoading(false)
      })
    return () => {
      active = false
    }
  }, [refresh, refreshVersion])
  const points = useMemo(
    () => selectAumRange(history?.points || [], start, end),
    [history, start, end],
  )
  const latest = history?.points[history.points.length - 1]
  const discrepancy = history && latest ? history.current[view] - latest[view] : 0
  const title = view === 'combined' ? 'Both funds' : view
  const mismatches = (reconciliation?.mismatches || []).filter(
    (item) => view === 'combined' || item.fund === view,
  )
  const chart = useMemo(
    () => (
      <CChartLine
        style={{ height: '100%' }}
        data={{
          datasets: [
            {
              label: title,
              data: points.map((point) => ({
                x: Date.parse(point.date),
                y: point[view],
              })),
              borderColor: view === 'AK1' ? '#00877a' : '#164b91',
              backgroundColor: 'rgba(22,75,145,0.10)',
              fill: true,
              stepped: true,
              pointRadius: points.length === 1 ? 3 : 0,
              borderWidth: 2,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          animation: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => new Date(items[0].parsed.x).toISOString().slice(0, 10),
                label: (context) => currency(Number(context.parsed.y)),
              },
            },
          },
          scales: {
            x: {
              type: 'linear',
              min: Date.parse(start),
              max: Date.parse(end),
              ticks: {
                maxTicksLimit: 8,
                callback: (value) => new Date(Number(value)).toISOString().slice(0, 10),
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) =>
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                  }).format(Number(value)),
              },
            },
          },
        }}
      />
    ),
    [points, view, title, start, end],
  )
  const chooseRange = (range: 'all' | 'year' | 'ytd') => {
    const date = new Date()
    setEnd(today())
    if (range === 'all') setStart(history?.points[0]?.date || today())
    else if (range === 'ytd') setStart(`${date.getUTCFullYear()}-01-01`)
    else {
      date.setUTCFullYear(date.getUTCFullYear() - 1)
      setStart(date.toISOString().slice(0, 10))
    }
  }
  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <strong>Assets under management</strong>
          <span className="d-inline-flex align-items-center" style={{ width: 16, height: 16 }}>
            {(loading || reconciliationLoading) && (
              <CSpinner size="sm" aria-label="Refreshing AUM data" />
            )}
          </span>
        </div>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => {
            refreshAum()
            setRefresh((value) => value + 1)
          }}
        >
          Refresh
        </CButton>
      </CCardHeader>
      <CCardBody>
        <div className="d-flex justify-content-between flex-wrap gap-3 mb-3">
          <CButtonGroup aria-label="AUM fund view">
            {(['combined', 'AGQ', 'AK1'] as View[]).map((value) => (
              <CButton
                key={value}
                color="primary"
                variant={view === value ? undefined : 'outline'}
                aria-pressed={view === value}
                onClick={() => setView(value)}
              >
                {value === 'combined' ? 'Combined' : value}
              </CButton>
            ))}
          </CButtonGroup>
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <CButtonGroup aria-label="AUM date range">
              <CButton color="secondary" variant="outline" onClick={() => chooseRange('ytd')}>
                YTD
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => chooseRange('year')}>
                1 year
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => chooseRange('all')}>
                All time
              </CButton>
            </CButtonGroup>
            <label>
              From
              <CFormInput
                type="date"
                value={start}
                max={end}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              To
              <CFormInput
                type="date"
                value={end}
                min={start}
                max={today()}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>
        </div>
        {error && <CAlert color="danger">{error}</CAlert>}
        {loading && !history && (
          <div role="status" className="py-4">
            Loading fund history…
          </div>
        )}
        {reconciliationLoading && !reconciliation && (
          <p role="status" className="small text-body-secondary">
            Checking balance reconciliation…
          </p>
        )}
        {reconciliationError && <CAlert color="warning">{reconciliationError}</CAlert>}
        {history && (
          <>
            <div className="d-flex flex-wrap gap-5 mb-3">
              <div>
                <div className="text-body-secondary">{title} · Final balance</div>
                <div className="fs-3 fw-semibold">{currency(history.current[view])}</div>
              </div>
              <div>
                <div className="text-body-secondary">Recorded balance at range end</div>
                <div className="fs-3">
                  {points.length ? currency(points[points.length - 1][view]) : '—'}
                </div>
              </div>
              <div>
                <div className="text-body-secondary">Clients</div>
                <div className="fs-3">{history.clients}</div>
              </div>
            </div>
            <p className="small text-body-secondary">
              Test clients are excluded from all AUM balances and history (
              {history.excludedTestClients || 0} excluded).
            </p>
            {(mismatches.length > 0 || (reconciliation?.invalidActivities || 0) > 0) && (
              <CAlert color="warning">
                <strong>Balance reconciliation warning</strong>
                <p className="mb-2">
                  {new Set(mismatches.map((item) => item.clientId)).size} clients have balances that
                  do not match their activities in this view. Activities = deposits − withdrawals +
                  reinvested profits. These clients remain included in AUM.
                </p>
                {(reconciliation?.invalidActivities || 0) > 0 && (
                  <p>
                    {reconciliation?.invalidActivities || 0} invalid activities could not be
                    reconciled.
                  </p>
                )}
                {mismatches.length > 0 && (
                  <details>
                    <summary>View {mismatches.length} fund balance differences</summary>
                    <div
                      className="table-responsive mt-2"
                      style={{ maxHeight: 320, overflowY: 'auto' }}
                    >
                      <table className="table table-sm mb-0 aum-reconciliation-table">
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>CID</th>
                            <th>Fund</th>
                            <th>Balance</th>
                            <th>Activities</th>
                            <th>Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mismatches.map((item) => (
                            <tr key={`${item.clientId}-${item.fund}`}>
                              <td>{item.clientName}</td>
                              <td>{item.clientId}</td>
                              <td>{item.fund}</td>
                              <td>{currency(item.balance)}</td>
                              <td>{currency(item.activities)}</td>
                              <td>{currency(item.difference)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </CAlert>
            )}
            {start > end ? (
              <CAlert color="warning">Choose an end date on or after the start date.</CAlert>
            ) : points.length ? (
              <div
                style={{ height: 340 }}
                role="img"
                aria-label={`${title} historical assets from ${start} to ${end}`}
              >
                {chart}
              </div>
            ) : (
              <p className="text-body-secondary py-4">No recorded balances for this date range.</p>
            )}
            <p className="small text-body-secondary mt-3 mb-0">
              Historical values use each client’s cumulative graphpoints, carried forward between
              updates. Combined = AGQ + AK1. Dates are UTC. Last loaded{' '}
              {new Date(history.asOf).toLocaleString()}.
            </p>
            {(Math.abs(discrepancy) > 0.01 ||
              history.missingHistory > 0 ||
              history.invalid > 0 ||
              history.invalidCurrentBalances > 0) && (
              <p className="small text-body-secondary mt-2 mb-0">
                Historical graphpoints may not include every balance adjustment.
                {Math.abs(discrepancy) > 0.01 &&
                  ` The latest recorded ${title.toLowerCase()} balance differs from current assets by ${currency(discrepancy)}.`}
                {history.missingHistory > 0 &&
                  ` ${history.missingHistory} funded client/fund combinations have no history.`}
                {(history.invalid > 0 || history.invalidCurrentBalances > 0) &&
                  ' Some invalid or missing records were excluded.'}
              </p>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}
