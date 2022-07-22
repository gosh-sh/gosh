import React from "react";
import { classNames } from "../../utils";
import BaseField, { IBaseFieldProps } from "./BaseField";


interface ITextFieldProps extends IBaseFieldProps {
    inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}

const TextField = (props: ITextFieldProps) => {
    const { inputProps = {}, field, form } = props;
    const { className, ...restInputProps } = inputProps;

    return (
        <BaseField {...props}>
            <div
                className={classNames(
                    'input',
                    form.touched[field.name] && form.errors[field.name] ? 'has-error' : null
                )}
            >
                <input
                    className={classNames('element', className)}
                    {...field}
                    {...restInputProps}
                />
            </div>
        </BaseField>
    );
}

export default TextField
