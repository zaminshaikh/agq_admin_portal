export type Fund = 'AGQ' | 'AK1'
export type BalancePoint = {
  clientId: string
  fund: string
  account: string
  amount: number
  time: number
  created: number
  id: string
}
export type AumPoint = { date: string; AGQ: number; AK1: number; combined: number }

/** Each cumulative point replaces that client's balance; it is never added twice. */
export function aggregateAum(
  points: BalancePoint[],
  now: number,
): { points: AumPoint[]; invalid: number } {
  let invalid = 0
  const valid = points
    .filter((point) => {
      if (point.account !== 'Cumulative') return false
      if (
        !['AGQ', 'AK1'].includes(point.fund) ||
        !Number.isFinite(point.amount) ||
        !Number.isFinite(point.time) ||
        !Number.isSafeInteger(Math.round(point.amount * 100))
      ) {
        invalid++
        return false
      }
      return point.time <= now
    })
    .sort((a, b) => a.time - b.time || a.created - b.created || a.id.localeCompare(b.id))
  const balances = new Map<string, number>()
  const totals: Record<Fund, number> = { AGQ: 0, AK1: 0 }
  const days = new Map<string, AumPoint>()
  for (const point of valid) {
    const fund = point.fund as Fund
    const key = `${point.clientId}/${fund}`
    const cents = Math.round(point.amount * 100)
    totals[fund] += cents - (balances.get(key) ?? 0)
    balances.set(key, cents)
    const date = new Date(point.time).toISOString().slice(0, 10)
    days.set(date, {
      date,
      AGQ: totals.AGQ / 100,
      AK1: totals.AK1 / 100,
      combined: (totals.AGQ + totals.AK1) / 100,
    })
  }
  return { points: [...days.values()], invalid }
}
