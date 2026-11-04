import * as functions from 'firebase-functions/v1'
import { getDatabase } from '../helpers/database'
import { checkAdminPermission } from '../helpers/adminPermissions'
import config from '../../config.json'
import { aggregateAum, BalancePoint, Fund } from './aum'
import { createAsyncCache } from './asyncCache'

const historyCache = createAsyncCache(async () => {
  const db = getDatabase()
  const users = await db.collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION).get()
  const clients = users.docs.filter((user) => user.data().isTestClient !== true)
  const points: BalancePoint[] = []
  const currentCents = { AGQ: 0, AK1: 0 }
  let missingHistory = 0
  let invalidCurrentBalances = 0
  const now = Date.now()
  // Only active client paths: archive/test collections and linked access lists
  // cannot introduce a second copy of the same client's assets.
  for (let i = 0; i < clients.length; i += 30) {
    await Promise.all(
      clients.slice(i, i + 30).map(async (user) => {
        const [graphs, assets] = await Promise.all([
          user.ref
            // Match the mobile app's current history. Some portal configs still
            // name the separate, older graphPoints collection.
            .collection('graphpoints')
            .where('account', '==', 'Cumulative')
            .get(),
          user.ref.collection(config.ASSETS_SUBCOLLECTION).get(),
        ])
        const covered = new Set<string>()
        for (const doc of graphs.docs) {
          const data = doc.data()
          const time = typeof data.time?.toMillis === 'function' ? data.time.toMillis() : NaN
          if (
            ['AGQ', 'AK1'].includes(data.fund) &&
            Number.isFinite(time) &&
            time <= now &&
            typeof data.amount === 'number' &&
            Number.isFinite(data.amount)
          )
            covered.add(data.fund)
          points.push({
            clientId: user.id,
            fund: data.fund,
            account: data.account,
            amount: typeof data.amount === 'number' ? data.amount : NaN,
            time,
            // Graph rebuilds append points sequentially. For equal event times,
            // the newest written cumulative point is the final balance.
            created: doc.createTime.seconds * 1e6 + Math.floor(doc.createTime.nanoseconds / 1000),
            id: doc.id,
          })
        }
        for (const [id, fund] of [
          [config.ASSETS_AGQ_DOC_ID, 'AGQ'],
          [config.ASSETS_AK1_DOC_ID, 'AK1'],
        ] as [string, Fund][]) {
          const value = assets.docs.find((doc) => doc.id === id)?.data().total
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            invalidCurrentBalances++
            continue
          }
          const balanceCents = Math.round(value * 100)
          currentCents[fund] += balanceCents
          if (value !== 0 && !covered.has(fund)) missingHistory++
        }
      }),
    )
  }
  const history = aggregateAum(points, now)
  return {
    ...history,
    current: {
      AGQ: currentCents.AGQ / 100,
      AK1: currentCents.AK1 / 100,
      combined: (currentCents.AGQ + currentCents.AK1) / 100,
    },
    clients: clients.length,
    excludedTestClients: users.size - clients.length,
    missingHistory,
    invalidCurrentBalances,
    asOf: new Date(now).toISOString(),
  }
})

export const getAumHistory = functions
  .runWith({ memory: '512MB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    checkAdminPermission(context, 'read')
    return historyCache.get(
      typeof data?.refreshToken === 'string' ? data.refreshToken.slice(0, 100) : undefined,
    )
  })
