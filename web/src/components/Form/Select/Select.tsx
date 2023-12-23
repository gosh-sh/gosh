import classNames from 'classnames'

type TSelectProps = React.InputHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean
}

const Select = (props: TSelectProps) => {
  const { className, hasError, children, ...rest } = props

  return (
    <div
      className={classNames(
        'px-4 flex flex-nowrap items-stretch overflow-hidden',
        'border border-border-gray-e6edff rounded-lg',
        'focus-within:border-gray-7c8db5',
        hasError ? 'border-rose-600' : null,
        className,
      )}
    >
      <select
        className={classNames(
          'block grow outline-none bg-transparent py-2',
          'disabled:text-gray-7c8db5 text-sm',
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  )
}

export { Select }
