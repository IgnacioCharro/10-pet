import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSuggestedTitle } from './useSuggestedTitle'
import type { AnimalType, AnimalSize, AnimalCondition } from '../types/case'

type Props = {
  animalType: AnimalType | ''
  animalSize: AnimalSize | ''
  animalCondition: AnimalCondition | ''
}

const inicial: Props = { animalType: '', animalSize: '', animalCondition: '' }

const render = (props: Props = inicial) =>
  renderHook((p: Props) => useSuggestedTitle(p.animalType, p.animalSize, p.animalCondition), {
    initialProps: props,
  })

describe('useSuggestedTitle', () => {
  it('sigue a la derivacion mientras nadie lo toque', () => {
    const { result, rerender } = render()
    expect(result.current.title).toBe('')

    rerender({ ...inicial, animalType: 'perro' })
    expect(result.current.title).toBe('Perro')

    rerender({ ...inicial, animalType: 'perro', animalSize: 'mediano' })
    expect(result.current.title).toBe('Perro mediano')
  })

  it('deja de sugerir en cuanto el usuario edita el titulo', () => {
    const { result, rerender } = render({ ...inicial, animalType: 'perro' })
    expect(result.current.title).toBe('Perro')

    act(() => result.current.setTitle('Firulais'))
    expect(result.current.title).toBe('Firulais')

    rerender({ ...inicial, animalType: 'gato', animalSize: 'chico' })
    expect(result.current.title).toBe('Firulais')
  })

  it('no vuelve a sugerir aunque el usuario borre lo que escribio', () => {
    // Borrar el campo es una edicion mas: si volviera a precargarse, el usuario
    // no tendria forma de dejarlo vacio a proposito antes de escribir el suyo.
    const { result, rerender } = render({ ...inicial, animalType: 'perro' })
    act(() => result.current.setTitle(''))
    rerender({ ...inicial, animalType: 'gato' })
    expect(result.current.title).toBe('')
  })
})
