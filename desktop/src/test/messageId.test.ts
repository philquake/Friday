import { describe, expect, it } from 'vitest'
import { nextMessageId } from '../core/messageId'

describe('nextMessageId', () => {
  it('creates unique IDs for consecutive messages', () => {
    expect(nextMessageId()).not.toBe(nextMessageId())
  })
})
