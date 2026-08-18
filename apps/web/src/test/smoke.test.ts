import { describe, it, expect } from 'vitest'

describe('infraestructura de tests', () => {
  it('corre en jsdom', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })
})
