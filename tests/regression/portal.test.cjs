const { test } = require('node:test')
const assert = require('node:assert/strict')
const { harness, normalize, revision } = require('./harness.cjs')
const date = new Date('2026-01-15T12:00:00Z')
function service() {
  const h = harness()
  const mod = h.load('src/db/database.ts')
  return { ...h, db: new mod.DatabaseService(), empty: mod.emptyClient }
}
const fund = {
  personal: { amount: 125.5, displayTitle: 'Personal', index: 0, firstDepositDate: date },
}

test('legacy client read preserves separate names, contact data, dates, and fund balances', async () => {
  const h = service()
  const stamp = h.Timestamp.fromDate(date)
  const client = await h.db.getClientFromSnapshot(
    h.snapshot('users/00001234', {
      name: { first: 'Jane', last: 'Doe', company: 'Example' },
      email: 'jane@example.com',
      uid: 'auth-jane',
      connectedUsers: ['002'],
      dob: stamp,
      firstDepositDate: stamp,
    }),
    h.snapshot('general', { total: 150, ytd: 8, totalYTD: 9, psi: 10, totalPSI: 11 }),
    h.snapshot('agq', {
      fund: 'AGQ',
      total: 125.5,
      personal: { ...fund.personal, firstDepositDate: stamp },
    }),
    h.snapshot('ak1', {
      fund: 'AK1',
      total: 24.5,
      ira: { amount: 24.5, displayTitle: 'IRA', index: 1 },
    }),
  )
  assert.equal(client.cid, '00001234')
  assert.equal(client.firstName, 'Jane')
  assert.equal(client.lastName, 'Doe')
  assert.equal(client.companyName, 'Example')
  assert.equal(client.initEmail, 'jane@example.com')
  assert.equal(client.appEmail, 'jane@example.com')
  assert.equal(client.uid, 'auth-jane')
  assert.equal(client.dob.toISOString(), date.toISOString())
  assert.deepEqual(normalize(client.connectedUsers), ['002'])
  assert.equal(client.totalAssets, 150)
  assert.equal(client.totalPSI, 11)
  assert.equal(client.assets.agq.personal.amount, 125.5)
  assert.equal(client.assets.ak1.ira.amount, 24.5)
})
test('missing clients return null and missing optional fields use legacy defaults', async () => {
  const h = service(),
    missing = h.snapshot('missing', undefined)
  assert.equal(await h.db.getClientFromSnapshot(missing, missing, missing, missing), null)
  const client = await h.db.getClientFromSnapshot(
    h.snapshot('users/1', {}),
    missing,
    missing,
    missing,
  )
  assert.equal(client.firstName, '')
  assert.equal(client.lastName, '')
  assert.equal(client.totalAssets, 0)
  assert.equal(client.dob, null)
  assert.deepEqual(normalize(client.assets), { agq: {}, ak1: {} })
})
test('saving a client preserves mobile name fields, account identifiers, and audit fields', async () => {
  const h = service()
  h.db.setCurrentAdmin({ name: 'Fixture Admin' })
  await h.db.setClient({
    ...h.empty,
    cid: '00001234',
    firstName: 'Jane ',
    lastName: 'Doe ',
    companyName: 'Example ',
    uid: 'uid',
    clientName: 'Family account',
    assets: { agq: fund, ak1: {} },
  })
  const write = h.calls.writes.find((w) => w.path === 'users/00001234' && w.data.name)
  assert.deepEqual(normalize(write.data.name), { first: 'Jane', last: 'Doe', company: 'Example' })
  assert.equal(write.data.uid, 'uid')
  assert.equal(write.options.merge, true)
  for (const field of ['firstName', 'lastName', 'companyName', 'cid', 'assets', 'totalAssets'])
    assert.equal(field in write.data, false, field)
  assert.equal(write.data.updatedBy, 'Fixture Admin')
  assert(write.data.updatedAt instanceof Date)
})
test('fund saves preserve decimals, recipients, timestamps, and combined totals', async () => {
  const h = service()
  await h.db.setAssets({
    ...h.empty,
    cid: '00001234',
    ytd: 3,
    totalYTD: 4,
    psi: 5,
    totalPSI: 6,
    assets: {
      agq: fund,
      ak1: { ira: { amount: 24.25, displayTitle: 'IRA', index: 1, firstDepositDate: null } },
    },
  })
  const byPath = Object.fromEntries(h.calls.writes.map((w) => [w.path, w.data]))
  assert.equal(byPath['users/00001234/assets/agq'].total, 125.5)
  assert.equal(byPath['users/00001234/assets/ak1'].total, 24.25)
  assert.equal(byPath['users/00001234/assets/general'].total, 149.75)
  assert.equal(byPath['users/00001234/assets/general'].totalPSI, 6)
  assert.equal(byPath['users/00001234/assets/agq'].personal.displayTitle, 'Personal')
  assert.equal(
    byPath['users/00001234/assets/agq'].personal.firstDepositDate.toDate().toISOString(),
    date.toISOString(),
  )
})
test('activity list uses the active-users discriminator and preserves parent client IDs', async () => {
  const h = service()
  h.results.set('**/activities', [
    [
      'users/00001234/activities/deposit',
      {
        parentCollection: 'users',
        type: 'deposit',
        amount: 125.5,
        time: h.Timestamp.fromDate(date),
      },
    ],
  ])
  const activities = await h.db.getActivities()
  const query = h.calls.reads.find((r) => r.path === '**/activities')
  assert.deepEqual(normalize(query.filters), [['parentCollection', '==', 'users']])
  assert.equal(activities[0].parentDocId, '00001234')
  assert.equal(activities[0].amount, 125.5)
  assert(activities[0].formattedTime.length > 0)
})
test('activity create and edit preserve recipient, fund, dividend behavior, and audit trail', async () => {
  const h = service()
  h.db.setCurrentAdmin({ name: 'Fixture Admin' })
  const activity = {
    type: 'profit',
    fund: 'AGQ',
    recipient: 'Jane Doe',
    amount: 12.25,
    isDividend: true,
    time: date,
    optional: undefined,
  }
  await h.db.createActivity(activity, '00001234')
  const created = h.calls.writes.at(-1)
  assert.equal(created.path, 'users/00001234/activities')
  assert.equal(created.data.parentCollection, 'users')
  assert.equal(created.data.recipient, 'Jane Doe')
  assert.equal(created.data.isDividend, true)
  assert.equal(created.data.amount, 12.25)
  assert.equal(created.data.createdBy, 'Fixture Admin')
  assert.equal('optional' in created.data, false)
  await h.db.setActivity({ ...activity, amount: 15 }, { activityDocId: 'a' }, '00001234')
  assert.equal(h.calls.writes.at(-1).path, 'users/00001234/activities/a')
  assert.equal(h.calls.writes.at(-1).data.amount, 15)
})
test('scheduled activity list remains scoped to active users and preserves execution dates', async () => {
  const h = service()
  h.results.set('scheduledActivities', [
    [
      'scheduledActivities/a',
      {
        usersCollectionID: 'users',
        activity: { time: h.Timestamp.fromDate(date), type: 'deposit', amount: 10 },
        changedAssets: null,
      },
    ],
  ])
  const rows = await h.db.getScheduledActivities()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].activity.amount, 10)
  assert.deepEqual(normalize(h.calls.reads.find((r) => r.path === 'scheduledActivities').filters), [
    ['usersCollectionID', '==', 'users'],
  ])
})
for (const [method, fn] of [
  ['getYTD', 'calculateYTD'],
  ['getTotalYTD', 'calculateTotalYTD'],
  ['getPSI', 'calculatePSI'],
  ['getTotalPSI', 'calculateTotalPSI'],
]) {
  test(`${method} preserves callable payload, returned amounts, and failure handling`, async () => {
    const h = service()
    h.replies.set(fn, 123.45)
    assert.equal(await h.db[method]('00001234'), 123.45)
    assert.deepEqual(normalize(h.calls.functions.at(-1)), {
      name: fn,
      data: { cid: '00001234', usersCollectionID: 'users' },
    })
    h.replies.set(fn, new Error('offline'))
    await assert.rejects(h.db[method]('00001234'))
  })
}
test('unlink keeps the legacy CID/UID payload and surfaces unsuccessful operations', async () => {
  const h = service()
  h.replies.set('unlinkUser', { success: true })
  await h.db.unlinkClient({ cid: '1', uid: 'auth-1' })
  assert.deepEqual(normalize(h.calls.functions.at(-1).data), {
    cid: '1',
    uid: 'auth-1',
    usersCollectionID: 'users',
  })
  h.replies.set('unlinkUser', { success: false })
  await assert.rejects(h.db.unlinkClient({ cid: '1', uid: 'auth-1' }))
})
for (const [role, expected] of [
  ['none', [false, false, false]],
  ['read', [true, false, false]],
  ['write', [true, true, false]],
  ['admin', [true, true, true]],
]) {
  test(`permission contract: ${role}`, () => {
    const h = harness()
    const admin = new (h.load('src/db/adminService.ts').AdminService)()
    assert.deepEqual(
      ['read', 'write', 'admin'].map((p) => admin.hasPermission(role, p)),
      expected,
    )
  })
}
test('an admin claim without an admin record does not grant portal access', async () => {
  const h = harness()
  const admin = new (h.load('src/db/adminService.ts').AdminService)()
  assert.deepEqual(
    normalize(
      await admin.getCurrentAdmin({
        uid: 'missing',
        getIdTokenResult: async () => ({ claims: { adminPermissions: 'admin' } }),
      }),
    ),
    { admin: null, permissions: 'none' },
  )
})
test('existing admin record reads permission from claims and preserves identity', async () => {
  const h = harness()
  h.records.set('admins/reader', { name: 'Reader', email: 'reader@example.com' })
  const admin = new (h.load('src/db/adminService.ts').AdminService)()
  const result = await admin.getCurrentAdmin({
    uid: 'reader',
    getIdTokenResult: async () => ({ claims: { adminPermissions: 'read' } }),
  })
  assert.equal(result.permissions, 'read')
  assert.equal(result.admin.id, 'reader')
  assert.equal(result.admin.name, 'Reader')
})
test('statement keeps recipient query and existing cash-flow calculation without uploading', async () => {
  const h = service()
  h.db.getClientGraphPoints = async () => [
    { account: 'Jane Doe', amount: 1000, time: new Date('2025-12-31') },
  ]
  h.results.set('users/00001234/activities', [
    ['users/00001234/activities/a', { time: new Date('2026-01-02'), type: 'deposit', amount: 200 }],
    [
      'users/00001234/activities/b',
      { time: new Date('2026-01-03'), type: 'withdrawal', amount: 50 },
    ],
    [
      'users/00001234/activities/c',
      { time: new Date('2026-01-04'), type: 'profit', amount: 20, isDividend: false },
    ],
    [
      'users/00001234/activities/d',
      { time: new Date('2026-01-05'), type: 'profit', amount: 10, isDividend: true },
    ],
    [
      'users/00001234/activities/e',
      { time: new Date('2027-01-01'), type: 'deposit', amount: 99999 },
    ],
  ])
  await h.db.generateStatementPDF(
    {
      ...h.empty,
      cid: '00001234',
      firstName: 'Jane',
      lastName: 'Doe',
      clientName: 'Family account',
    },
    new Date('2026-01-01'),
    new Date('2026-01-31'),
    'Jane Doe',
  )
  assert.deepEqual(
    normalize(h.calls.reads.find((r) => r.path === 'users/00001234/activities').filters),
    [['recipient', '==', 'Jane Doe']],
  )
  const definition = JSON.stringify(h.calls.pdf[0])
  assert.match(definition, /1,160\.00/)
  assert.doesNotMatch(definition, /99,999/)
  assert.equal(h.calls.deliveries, 1)
})
