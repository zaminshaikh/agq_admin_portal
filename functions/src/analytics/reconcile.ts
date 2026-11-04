import { Fund } from './aum'

export type Reconciliation = {
  clientId: string
  clientName: string
  fund: Fund
  balance: number
  activities: number
  difference: number
}

// Match the balance history's cash-flow rules: reinvested profits count;
// paid-out profits do not. Round the net total, preserving fractional cents.
export function activityBalances(records: FirebaseFirestore.DocumentData[], now: number) {
  const totals = { AGQ: 0, AK1: 0 }
  let invalid = 0
  for (const record of records) {
    if (!['AGQ', 'AK1'].includes(record.fund)) continue
    if (!['deposit', 'withdrawal'].includes(record.type) && !record.isDividend) continue
    const time = typeof record.time?.toMillis === 'function' ? record.time.toMillis() : NaN
    if (!Number.isFinite(time) || typeof record.amount !== 'number' || !Number.isFinite(record.amount)) {
      invalid++
      continue
    }
    if (time > now) continue
    totals[record.fund as Fund] += record.amount * (record.type === 'withdrawal' ? -1 : 1)
  }
  return { cents: { AGQ: Math.round(totals.AGQ * 100), AK1: Math.round(totals.AK1 * 100) }, invalid }
}
