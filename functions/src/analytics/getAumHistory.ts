import * as functions from 'firebase-functions/v1'
import { getDatabase } from '../helpers/database'
import { checkAdminPermission } from '../helpers/adminPermissions'
import config from '../../config.json'
import { aggregateAum, BalancePoint, Fund } from './aum'

export const getAumHistory = functions
  .runWith({ memory: '512MB', timeoutSeconds: 120 })
  .https.onCall(async (_data, context) => {
    checkAdminPermission(context, 'read')
    const db = getDatabase()
    const users = await db.collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION).get()
    const points: BalancePoint[] = []
    const currentCents = { AGQ: 0, AK1: 0 }
    let missingHistory = 0
    let invalidCurrentBalances = 0
    const now = Date.now()
    // Only active client paths: archive/test collections and linked access lists
    // cannot introduce a second copy of the same client's assets.
    for (let i = 0; i < users.docs.length; i += 10) {
      await Promise.all(
        users.docs.slice(i, i + 10).map(async (user) => {
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
            currentCents[fund] += Math.round(value * 100)
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
      clients: users.size,
      missingHistory,
      invalidCurrentBalances,
      asOf: new Date(now).toISOString(),
    }
  })
