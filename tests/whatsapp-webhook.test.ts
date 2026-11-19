import { createHmac } from 'crypto'
import { describe, expect, test } from 'vitest'
import { parseStatuses, planStatusUpdate, verifyHandshake, verifySignature } from '@/lib/notifications/whatsapp-webhook'

const sign = (body: string, secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

describe('verifyHandshake', () => {
  const params = (o: Record<string, string>) => new URLSearchParams(o)
  test('echoes the challenge for a correct token', () => {
    expect(verifyHandshake(params({ 'hub.mode': 'subscribe', 'hub.verify_token': 'secret', 'hub.challenge': '12345' }), 'secret')).toBe('12345')
  })
  test.each([
    ['wrong token', { 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': '1' }],
    ['wrong mode', { 'hub.mode': 'unsubscribe', 'hub.verify_token': 'secret', 'hub.challenge': '1' }],
    ['no challenge', { 'hub.mode': 'subscribe', 'hub.verify_token': 'secret' }],
    ['no token', { 'hub.mode': 'subscribe', 'hub.challenge': '1' }],
  ])('rejects %s', (_n, o) => expect(verifyHandshake(params(o), 'secret')).toBeNull())
  test('rejects everything when no token is configured', () => {
    expect(verifyHandshake(params({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '1' }), undefined)).toBeNull()
  })
})

describe('verifySignature', () => {
  const body = '{"object":"whatsapp_business_account","entry":[]}'
  test('accepts a correct signature over the raw body', () => {
    expect(verifySignature(body, sign(body, 's3cret'), 's3cret')).toBe(true)
  })
  test('rejects a tampered body', () => {
    expect(verifySignature(body + ' ', sign(body, 's3cret'), 's3cret')).toBe(false)
  })
  test('is byte-exact: re-serialised JSON does not match', () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2)
    expect(verifySignature(pretty, sign(body, 's3cret'), 's3cret')).toBe(false)
  })
  test('rejects wrong secret, missing header, wrong prefix and malformed hex', () => {
    expect(verifySignature(body, sign(body, 'other'), 's3cret')).toBe(false)
    expect(verifySignature(body, null, 's3cret')).toBe(false)
    expect(verifySignature(body, sign(body, 's3cret').replace('sha256=', 'sha1='), 's3cret')).toBe(false)
    expect(verifySignature(body, 'sha256=zzzz', 's3cret')).toBe(false)
    expect(verifySignature(body, 'sha256=', 's3cret')).toBe(false)
  })
})

describe('parseStatuses', () => {
  const payload = (statuses: unknown[]) => ({ object: 'whatsapp_business_account', entry: [{ id: '1', changes: [{ field: 'messages', value: { statuses } }] }] })

  test('reads sent/delivered/read with Meta timestamps (seconds)', () => {
    const result = parseStatuses(payload([
      { id: 'wamid.A', status: 'sent', timestamp: '1700000000' },
      { id: 'wamid.A', status: 'delivered', timestamp: 1700000005 },
      { id: 'wamid.A', status: 'read', timestamp: '1700000010' },
    ]))
    expect(result.map(r => r.status)).toEqual(['sent', 'delivered', 'read'])
    expect(result[0].at).toEqual(new Date(1700000000 * 1000))
  })

  test('failed carries the error detail', () => {
    const [failed] = parseStatuses(payload([{ id: 'wamid.B', status: 'failed', timestamp: '1', errors: [{ code: 131026, title: 'Undeliverable', message: 'Message undeliverable' }] }]))
    expect(failed.error).toBe('Message undeliverable')
  })

  test('ignores unknown statuses, missing ids, inbound messages and junk', () => {
    expect(parseStatuses(payload([{ id: 'x', status: 'deleted' }, { status: 'sent' }]))).toEqual([])
    expect(parseStatuses({ entry: [{ changes: [{ value: { messages: [{ id: 'm' }] } }] }] })).toEqual([])
    expect(parseStatuses(null)).toEqual([])
    expect(parseStatuses({ entry: 'nope' })).toEqual([])
  })

  test('falls back to now for a missing timestamp', () => {
    const now = new Date('2026-12-01T00:00:00Z')
    expect(parseStatuses(payload([{ id: 'x', status: 'sent' }]), now)[0].at).toEqual(now)
  })
})

describe('planStatusUpdate', () => {
  const at = new Date('2026-12-01T00:00:00Z')
  const st = (status: 'sent' | 'delivered' | 'read' | 'failed', error?: string) => ({ messageId: 'w', status, at, error })
  const fresh = { status: 'sent', deliveredAt: null, readAt: null }

  test('sent is a no-op', () => expect(planStatusUpdate(fresh, st('sent'))).toBeNull())
  test('delivered records deliveredAt and leaves status "sent" (reminder dedupe depends on it)', () => {
    const patch = planStatusUpdate(fresh, st('delivered'))
    expect(patch).toEqual({ deliveredAt: at })
    expect(patch).not.toHaveProperty('status')
  })
  test('read records readAt and backfills a missing deliveredAt', () => {
    expect(planStatusUpdate(fresh, st('read'))).toEqual({ readAt: at, deliveredAt: at })
    expect(planStatusUpdate({ ...fresh, deliveredAt: at }, st('read'))).toEqual({ readAt: at })
  })
  test('failed marks the notification failed with the error', () => {
    expect(planStatusUpdate(fresh, st('failed', 'Undeliverable'))).toMatchObject({ status: 'failed', errorCount: 1, lastErrorMessage: 'Undeliverable' })
  })
  test('out-of-order webhooks never regress a newer state', () => {
    const read = { status: 'sent', deliveredAt: at, readAt: at }
    expect(planStatusUpdate(read, st('delivered'))).toBeNull()
    expect(planStatusUpdate(read, st('failed'))).toBeNull()
    expect(planStatusUpdate({ ...fresh, deliveredAt: at }, st('delivered'))).toBeNull()
    expect(planStatusUpdate(read, st('read'))).toBeNull()
  })
})
