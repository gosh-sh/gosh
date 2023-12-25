import { Select } from '../Form'
import { BaseField, IBaseFieldProps } from './BaseField'

interface IFormikSelectProps extends IBaseFieldProps {
  inputProps: React.InputHTMLAttributes<HTMLSelectElement>
}

const FormikSelect = (props: IFormikSelectProps) => {
  const { inputProps = {}, field, form, ...rest } = props

  return (
    <BaseField {...props}>
      <Select
        {...field}
        {...rest}
        {...inputProps}
        hasError={!!form.touched[field.name] && !!form.errors[field.name]}
      />
    </BaseField>
  )
}

export { FormikSelect }
