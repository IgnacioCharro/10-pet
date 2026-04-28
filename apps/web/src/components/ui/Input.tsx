import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  error?: string | null
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = '', ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={[
          'rounded-md border px-3 py-2 text-base md:text-sm placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export default Input
