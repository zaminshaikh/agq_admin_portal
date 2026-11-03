const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createAsyncCache } = require('../lib/src/analytics/asyncCache')
test('deduplicates concurrent loads, reuses a result, and expires it', async () => {
  let now = 0,
    reads = 0
  const cache = createAsyncCache(
    async () => ++reads,
    60,
    () => now,
  )
  assert.deepEqual(await Promise.all([cache.get(), cache.get()]), [1, 1])
  now = 59
  assert.equal(await cache.get(), 1)
  now = 60
  assert.equal(await cache.get(), 2)
})
test('a change refreshes immediately and an older request cannot overwrite it', async () => {
  const resolvers = []
  const cache = createAsyncCache(() => new Promise((resolve) => resolvers.push(resolve)))
  const old = cache.get()
  await Promise.resolve()
  const fresh = cache.get('edited')
  await Promise.resolve()
  resolvers[1]('fresh')
  assert.equal(await fresh, 'fresh')
  resolvers[0]('old')
  await old
  assert.equal(await cache.get('edited'), 'fresh')
  assert.equal(resolvers.length, 2)
})
test('failed refreshes are not cached and can be retried', async () => {
  let fail = true
  const cache = createAsyncCache(async () => {
    if (fail) throw Error('offline')
    return 'restored'
  })
  await assert.rejects(cache.get(), /offline/)
  fail = false
  assert.equal(await cache.get(), 'restored')
})
test('cache expiry is bounded by request start, not completion', async () => {
  let now = 0,
    reads = 0
  const cache = createAsyncCache(
    async () => {
      now += 100
      return ++reads
    },
    60,
    () => now,
  )
  assert.equal(await cache.get(), 1)
  assert.equal(await cache.get(), 2)
})
