import React from "react";
import { classNames } from "../../utils";
import BaseField, { IBaseFieldProps } from "./BaseField";


interface ITextAreaFieldProps extends IBaseFieldProps {
    inputProps: React.InputHTMLAttributes<HTMLTextAreaElement>;
}

const TextareaField = (props: ITextAreaFieldProps) => {
    const { inputProps, field, form } = props;
    const { className, ...restInputProps } = inputProps;

    return (
        <BaseField {...props}>
            <div
                className={classNames(
                    'input',
                    form.touched[field.name] && form.errors[field.name] ? 'has-error' : null
                )}
            >
                <textarea
                    className={classNames('element', className)}
                    {...field}
                    {...restInputProps}
                />
            </div>
        </BaseField>
    );
}

export default TextareaField
