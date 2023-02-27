import { Textarea } from '../Form'
import BaseField, { IBaseFieldProps } from './BaseField'

interface IFormikTextareaProps extends IBaseFieldProps {
    inputProps: React.InputHTMLAttributes<HTMLTextAreaElement>
}

const FormikTextarea = (props: IFormikTextareaProps) => {
    const { inputProps = {}, field, form, ...rest } = props

    return (
        <BaseField {...props}>
            <Textarea
                {...field}
                {...rest}
                {...inputProps}
                hasError={!!form.touched[field.name] && !!form.errors[field.name]}
            />
        </BaseField>
    )
}

export { FormikTextarea }
