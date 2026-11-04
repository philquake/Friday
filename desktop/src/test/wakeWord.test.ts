import { describe, it, expect } from 'vitest'
import { matchWake } from '../core/wakeWord'

describe('matchWake', () => {
  it.each([
    'Hey Friday',
    'Hey, Friday.',
    'hey friday!',
    'Hay Friday',
    'OK Friday',
    'Hey Fry Day',
    'well hey friday',
  ])('matches "%s"', (text) => {
    expect(matchWake(text).matched).toBe(true)
  })

  it.each([
    'Friday is my favourite day',
    'hey there',
    'what day is it friday',
    'they friday',
    '',
  ])('ignores "%s"', (text) => {
    expect(matchWake(text).matched).toBe(false)
  })

  it('returns what was said after the phrase', () => {
    expect(matchWake("Hey Friday, what's the weather?").command).toBe("what's the weather")
    expect(matchWake('Hey Friday').command).toBe('')
  })
})
