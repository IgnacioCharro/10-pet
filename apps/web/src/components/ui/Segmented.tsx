interface Option {
  id: string
  label: string
}

interface SegmentedProps {
  options: Option[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export default function Segmented({ options, value, onChange, className = '' }: SegmentedProps) {
  return (
    <div
      className={[
        'flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-[11px] p-[3px] w-fit',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={[
              'px-4 py-2 rounded-lg text-[13.5px] font-semibold transition-colors',
              active
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
