import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// testing-library no desmonta solo cuando globals:true; sin esto los tests se
// contaminan entre si porque el DOM del anterior sigue montado.
afterEach(() => {
  cleanup()
})
