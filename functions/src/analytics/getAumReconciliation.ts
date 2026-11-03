import * as functions from 'firebase-functions/v1'
import { getDatabase } from '../helpers/database'
import { checkAdminPermission } from '../helpers/adminPermissions'
import config from '../../config.json'
import { Fund } from './aum'
import { activityBalances, Reconciliation } from './reconcile'
import { createAsyncCache } from './asyncCache'

const reconciliationCache = createAsyncCache(async () => {
  const users = await getDatabase().collection(config.FIRESTORE_ACTIVE_USERS_COLLECTION).get()
  const clients = users.docs.filter((user) => user.data().isTestClient !== true)
  const mismatches: Reconciliation[] = []
  let invalidActivities = 0
  const now = Date.now()
  for (let i = 0; i < clients.length; i += 30) {
    await Promise.all(
      clients.slice(i, i + 30).map(async (user) => {
        const [assets, activities] = await Promise.all([
          user.ref.collection(config.ASSETS_SUBCOLLECTION).get(),
          user.ref.collection('activities').get(),
        ])
        const activity = activityBalances(
          activities.docs.map((doc) => doc.data()),
          now,
        )
        invalidActivities += activity.invalid
        const person = user.data()
        const clientName =
          person.clientName?.trim() ||
          [person.name?.first, person.name?.last].filter(Boolean).join(' ') ||
          user.id
        for (const [id, fund] of [
          [config.ASSETS_AGQ_DOC_ID, 'AGQ'],
          [config.ASSETS_AK1_DOC_ID, 'AK1'],
        ] as [string, Fund][]) {
          const value = assets.docs.find((doc) => doc.id === id)?.data().total
          if (typeof value !== 'number' || !Number.isFinite(value)) continue
          const balanceCents = Math.round(value * 100)
          const difference = balanceCents - activity.cents[fund]
          if (difference !== 0)
            mismatches.push({
              clientId: user.id,
              clientName,
              fund,
              balance: balanceCents / 100,
              activities: activity.cents[fund] / 100,
              difference: difference / 100,
            })
        }
      }),
    )
  }
  return {
    mismatches: mismatches.sort(
      (a, b) =>
        Math.abs(b.difference) - Math.abs(a.difference) || a.clientId.localeCompare(b.clientId),
    ),
    invalidActivities,
    asOf: new Date(now).toISOString(),
  }
})

export const getAumReconciliation = functions
  .runWith({ memory: '512MB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    checkAdminPermission(context, 'read')
    return reconciliationCache.get(
      typeof data?.refreshToken === 'string' ? data.refreshToken.slice(0, 100) : undefined,
    )
  })
