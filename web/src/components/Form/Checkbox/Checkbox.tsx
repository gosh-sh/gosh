import classNames from 'classnames'

type TCheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode
}

const Checkbox = (props: TCheckboxProps) => {
  const { label, className, type = 'checkbox', disabled, ...rest } = props

  return (
    <label
      className={classNames('checkbox-custom', disabled ? 'disabled' : null, className)}
    >
      {label}
      <input
        className={classNames(
          'block grow outline-none bg-transparent px-4 py-2',
          'disabled:text-gray-7c8db5',
        )}
        {...rest}
        type={type}
        disabled={disabled}
      />
      <span className="checkmark"></span>
    </label>
  )
}

export { Checkbox }
