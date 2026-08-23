import { describe, it, expect } from 'vitest'
import { LISTING_TYPE } from './listingType'

describe('LISTING_TYPE', () => {
  it('cubre exactamente los dos tipos vivos', () => {
    expect(Object.keys(LISTING_TYPE).sort()).toEqual(['found', 'lost'])
  })
})
