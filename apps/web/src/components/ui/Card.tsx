import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export default function Card({
  children,
  padded = true,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={[
        'bg-white rounded-lg shadow-sm border border-gray-200',
        padded ? 'p-6' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
