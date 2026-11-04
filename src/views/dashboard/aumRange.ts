export type AumPoint = { date: string; AGQ: number; AK1: number; combined: number }

/** Carry the opening balance into the range instead of resetting it to zero. */
export function selectAumRange(points: AumPoint[], start: string, end: string): AumPoint[] {
  if (!start || !end || start > end || !points.length) return []
  const selected = points.filter((point) => point.date >= start && point.date <= end)
  const prior = [...points].reverse().find((point) => point.date < start)
  if (prior && selected[0]?.date !== start) selected.unshift({ ...prior, date: start })
  const last = selected[selected.length - 1]
  if (last && last.date < end) selected.push({ ...last, date: end })
  return selected
}
