import { Switch } from '@headlessui/react'
import { IBaseFieldProps } from './BaseField'
import { ErrorMessage } from 'formik'
import classNames from 'classnames'

const SwitchField = (props: IBaseFieldProps) => {
  const {
    className,
    label,
    labelClassName,
    errorEnabled = true,
    errorClassName,
    form,
    field,
  } = props

  return (
    <>
      <Switch.Group>
        <div className={classNames('flex items-center', className)}>
          <Switch
            checked={form.values[field.name]}
            onChange={(value: boolean) => {
              form.setFieldTouched(field.name, true)
              form.setFieldValue(field.name, value, true)
            }}
            className={classNames(
              'input-switch',
              form.values[field.name] ? 'checked' : null,
            )}
          >
            <span />
          </Switch>

          {label && (
            <Switch.Label className={classNames('ml-3 cursor-pointer', labelClassName)}>
              {label}
            </Switch.Label>
          )}
        </div>
      </Switch.Group>

      {errorEnabled && form.touched[field.name] && form.errors[field.name] && (
        <div className={classNames('text-red-dd3a3a', errorClassName)}>
          <ErrorMessage name={field.name} />
        </div>
      )}
    </>
  )
}

export { SwitchField }
