import { Checkbox } from '../Form'
import BaseField, { IBaseFieldProps } from './BaseField'

interface IFormikCheckboxProps extends IBaseFieldProps {
    inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
        label?: React.ReactNode
    }
}

const FormikCheckbox = (props: IFormikCheckboxProps) => {
    const { inputProps = {}, helpClassName, field, form, ...rest } = props

    return (
        <BaseField {...props}>
            <Checkbox {...field} {...rest} {...inputProps} />
        </BaseField>
    )
}

export { FormikCheckbox }
