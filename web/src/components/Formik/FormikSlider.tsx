import { Slider } from '../Form'
import { BaseField, IBaseFieldProps } from './BaseField'

interface IFormikSliderProps extends IBaseFieldProps {
  inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: React.ReactNode
  }
}

const FormikSlider = (props: IFormikSliderProps) => {
  const { inputProps, field, form, ...rest } = props

  return (
    <BaseField {...props}>
      <Slider {...field} {...rest} {...inputProps} />
    </BaseField>
  )
}

export { FormikSlider }
