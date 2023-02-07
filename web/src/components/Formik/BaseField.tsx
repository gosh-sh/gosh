import { ErrorMessage, FieldProps } from 'formik'
import { classNames } from 'react-gosh'

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
                        'block mb-2 font-medium',
                        labelClassName,
                        form.touched[field.name] && form.errors[field.name]
                            ? 'text-rose-600'
                            : 'text-gray-7c8db5',
                    )}
                >
                    {label}
                </label>
            )}
            {children}
            {help && (
                <div className={classNames('text-xs text-gray-7c8db5', helpClassName)}>
                    {help}
                </div>
            )}
            {errorEnabled && form.touched[field.name] && form.errors[field.name] && (
                <div className={classNames('text-rose-600 text-sm', errorClassName)}>
                    <ErrorMessage name={field.name} />
                </div>
            )}
        </>
    )
}

export default BaseField
