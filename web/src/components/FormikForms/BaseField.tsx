import React from "react";
import { ErrorMessage, FieldProps } from "formik";
import { classNames } from "../../utils";


export interface IBaseFieldProps extends FieldProps {
    className?: string;
    children: React.ReactNode;
    label?: string;
    labelClassName?: string;
    help?: string;
    helpClassName?: string;
    errorEnabled?: boolean;
    errorClassName?: string;
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
        form
    } = props;

    return (
        <>
            {label && (
                <label
                    htmlFor={field.name}
                    className={classNames(
                        'block mb-1 text-sm font-semibold',
                        labelClassName,
                        form.touched[field.name] && form.errors[field.name] ? 'text-rose-600' : 'text-gray-700'
                    )}
                >
                    {label}
                </label>
            )}
            {children}
            {help && (
                <div className={classNames('text-xs text-gray-500', helpClassName)}>
                    {help}
                </div>
            )}
            {errorEnabled && form.touched[field.name] && form.errors[field.name] && (
                <div className={classNames('text-red-dd3a3a text-sm', errorClassName)}>
                    <ErrorMessage name={field.name} />
                </div>
            )}
        </>
    );
}

export default BaseField
