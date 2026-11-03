import { httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { app } from '../../App'
import { databaseId, getPortalFunctions } from '../../db/firebaseEnvironment'
import { getAumRevision } from '../../db/aumChanges'
import type { AumPoint } from './aumRange'

export type History = {
  points: AumPoint[]
  current: Omit<AumPoint, 'date'>
  clients: number
  excludedTestClients: number
  missingHistory: number
  invalidCurrentBalances: number
  invalid: number
  asOf: string
}
export type Reconciliation = {
  mismatches: {
    clientId: string
    clientName: string
    fund: 'AGQ' | 'AK1'
    balance: number
    activities: number
    difference: number
  }[]
  invalidActivities: number
  asOf: string
}

export const AUM_CACHE_TTL_MS = 10 * 60_000

// Memory only: no financial data in localStorage. Scope to signed-in user/database.
let scope = ''
let revision = -1
let refreshToken: string | undefined
let generation = 0
const caches = new Map<
  string,
  { data?: History | Reconciliation; pending?: Promise<History | Reconciliation> }
>()
function prepare(force = false) {
  const nextScope = `${databaseId}:${getAuth(app).currentUser?.uid || ''}`
  if (nextScope !== scope) {
    scope = nextScope
    caches.clear()
    revision = getAumRevision()
    refreshToken = revision ? crypto.randomUUID() : undefined
    generation++
  }
  if (force || revision !== getAumRevision()) {
    revision = getAumRevision()
    refreshToken = crypto.randomUUID()
    generation++
    caches.forEach((entry) => {
      entry.pending = undefined
    })
    // Keep the previous results visible while fetching their replacements.
  }
}
export function refreshAum() {
  prepare(true)
}
export function cachedAum<T extends History | Reconciliation>(name: string): T | null {
  prepare()
  return (caches.get(name)?.data as T) || null
}
export function loadAum<T extends History | Reconciliation>(name: string): Promise<T> {
  prepare()
  let entry = caches.get(name)
  if (!entry) {
    entry = {}
    caches.set(name, entry)
  }
  // Each generation must be fetched once even when old data remains displayed.
  const key = `${scope}:${generation}`
  const tagged = entry as typeof entry & { key?: string }
  if (
    tagged.key === key &&
    entry.data &&
    Date.parse(entry.data.asOf) + AUM_CACHE_TTL_MS > Date.now()
  )
    return Promise.resolve(entry.data as T)
  if (entry.pending) return entry.pending as Promise<T>
  const request = httpsCallable<{ refreshToken?: string }, T>(getPortalFunctions(app), name, {
    timeout: 120000,
  })(refreshToken ? { refreshToken } : {})
    .then((result) => {
      if (entry!.pending === request) {
        entry!.data = result.data
        tagged.key = key
      }
      return result.data
    })
    .finally(() => {
      if (entry!.pending === request) entry!.pending = undefined
    })
  entry.pending = request
  return request
}
