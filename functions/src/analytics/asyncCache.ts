// Bounded per-instance cache. Authentication must be checked before calling get.
export function createAsyncCache<T>(load: () => Promise<T>, ttlMs = 10 * 60_000, now = Date.now) {
  let cached: { value: T; expires: number } | undefined
  let pending: Promise<T> | undefined
  let refreshToken: string | undefined
  return {
    get(token?: string): Promise<T> {
      if (token && token !== refreshToken) {
        refreshToken = token
        cached = undefined
        pending = undefined
      }
      if (cached && cached.expires > now()) return Promise.resolve(cached.value)
      if (pending) return pending
      // Timestamp at start bounds staleness even when computation is slow.
      const expires = now() + ttlMs
      const request = Promise.resolve()
        .then(load)
        .then((value) => {
          if (pending === request) cached = { value, expires }
          return value
        })
        .finally(() => {
          if (pending === request) pending = undefined
        })
      pending = request
      return request
    },
  }
}
