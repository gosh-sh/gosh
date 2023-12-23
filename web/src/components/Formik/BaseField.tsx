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
        <div
          className={classNames('text-red-ff3b30 text-xs mt-0.5 px-1', errorClassName)}
        >
          <ErrorMessage name={field.name} />
        </div>
      )}
    </>
  )
}

export { BaseField }
