import { Input } from '../Form'
import { BaseField, IBaseFieldProps } from './BaseField'

interface IFormikInputProps extends IBaseFieldProps {
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
}

const FormikInput = (props: IFormikInputProps) => {
  const { inputProps = {}, field, form, ...rest } = props

  return (
    <BaseField {...props}>
      <Input
        {...field}
        {...rest}
        {...inputProps}
        hasError={!!form.touched[field.name] && !!form.errors[field.name]}
      />
    </BaseField>
  )
}

export { FormikInput }
