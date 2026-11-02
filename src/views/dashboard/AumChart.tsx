import { useEffect, useMemo, useState } from 'react'
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
import { httpsCallable } from 'firebase/functions'
import { app } from '../../App'
import { getPortalFunctions } from '../../db/firebaseEnvironment'
import { AumPoint, selectAumRange } from './aumRange'

type View = 'combined' | 'AGQ' | 'AK1'
type History = {
  points: AumPoint[]
  current: Omit<AumPoint, 'date'>
  clients: number
  excludedTestClients: number
  mismatches: { clientId: string; clientName: string; fund: 'AGQ' | 'AK1'; balance: number; activities: number; difference: number }[]
  invalidActivities: number
  missingHistory: number
  invalidCurrentBalances: number
  invalid: number
  asOf: string
}
const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
const today = () => new Date().toISOString().slice(0, 10)

export default function AumChart({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const [history, setHistory] = useState<History | null>(null)
  const [view, setView] = useState<View>('combined')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState(today)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setHistory(null)
    setError('')
    httpsCallable<void, History>(getPortalFunctions(app), 'getAumHistory', { timeout: 120000 })()
      .then((result) => {
        if (!active) return
        setHistory(result.data)
        setStart((value) => value || result.data.points[0]?.date || today())
      })
      .catch(() => {
        if (active) setError('Could not load AUM history. Check your connection and retry.')
      })
      .finally(() => {
        if (active) setLoading(false)
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
  const mismatches = (history?.mismatches || []).filter(item => view === 'combined' || item.fund === view)
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
        <strong>Assets under management</strong>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
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
        {loading && (
          <div role="status" className="py-4">
            <CSpinner size="sm" /> Loading fund history…
          </div>
        )}
        {!loading && !error && history && (
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
              Test clients are excluded from all AUM balances and history ({history.excludedTestClients || 0} excluded).
            </p>
            {(mismatches.length > 0 || history.invalidActivities > 0) && (
              <CAlert color="warning">
                <strong>Balance reconciliation warning</strong>
                <p className="mb-2">
                  {new Set(mismatches.map(item => item.clientId)).size} clients have balances that do not match their activities in this view.
                  {' '}Activities = deposits − withdrawals + reinvested profits. These clients remain included in AUM.
                </p>
                {history.invalidActivities > 0 && <p>{history.invalidActivities} invalid activities could not be reconciled.</p>}
                {mismatches.length > 0 && <details>
                  <summary>View {mismatches.length} fund balance differences</summary>
                  <div className="table-responsive mt-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    <table className="table table-sm mb-0">
                      <thead><tr><th>Client</th><th>CID</th><th>Fund</th><th>Balance</th><th>Activities</th><th>Difference</th></tr></thead>
                      <tbody>{mismatches.map(item => <tr key={`${item.clientId}-${item.fund}`}>
                        <td>{item.clientName}</td><td>{item.clientId}</td><td>{item.fund}</td>
                        <td>{currency(item.balance)}</td><td>{currency(item.activities)}</td><td>{currency(item.difference)}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                </details>}
              </CAlert>
            )}
            {(Math.abs(discrepancy) > 0.01 ||
              history.missingHistory > 0 ||
              history.invalid > 0 ||
              history.invalidCurrentBalances > 0) && (
              <CAlert color="warning">
                Historical graphpoints may not include every balance adjustment.
                {Math.abs(discrepancy) > 0.01 &&
                  ` The latest recorded ${title.toLowerCase()} balance differs from current assets by ${currency(discrepancy)}.`}
                {history.missingHistory > 0 &&
                  ` ${history.missingHistory} funded client/fund combinations have no history.`}
                {(history.invalid > 0 || history.invalidCurrentBalances > 0) &&
                  ' Some invalid or missing records were excluded.'}
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
              </div>
            ) : (
              <p className="text-body-secondary py-4">No recorded balances for this date range.</p>
            )}
            <p className="small text-body-secondary mt-3 mb-0">
              Historical values use each client’s cumulative graphpoints, carried forward between
              updates. Combined = AGQ + AK1. Dates are UTC. Last loaded{' '}
              {new Date(history.asOf).toLocaleString()}.
            </p>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}
