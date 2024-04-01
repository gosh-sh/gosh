import classNames from 'classnames'
import { ErrorMessage, FieldProps } from 'formik'

export interface IBaseFieldProps extends FieldProps {
  className?: string
  children: React.ReactNode
  label?: string
  labelClassName?: string
  help?: React.ReactNode
  helpClassName?: string
  errorEnabled?: boolean
  errorClassName?: string
}

const BaseField = (props: IBaseFieldProps) => {
  const {
    children,
    label,
    labelClassName,
    help,
    helpClassName,
    errorEnabled = true,
    errorClassName,
    field,
    form,
  } = props

  return (
    <>
      {label && (
        <label
          htmlFor={field.name}
          className={classNames(
            'block mb-2 text-sm',
            labelClassName,
            form.touched[field.name] && form.errors[field.name]
              ? 'text-red-ff3b30'
              : 'text-gray-7c8db5',
          )}
        >
          {label}
        </label>
      )}
      {children}
      {help && (
        <div className={classNames('text-xs text-gray-7c8db5 mt-2 px-1', helpClassName)}>
          {help}
        </div>
      )}
      {errorEnabled && form.touched[field.name] && form.errors[field.name] && (
        <div className={classNames('relative', errorClassName)}>
          <ErrorMessage
            className="text-xs bg-rose-100 text-rose-500 mt-1 px-2 py-1 rounded absolute z-[1]"
            component="div"
            name={field.name}
          />
        </div>
      )}
    </>
  )
}

export { BaseField }
