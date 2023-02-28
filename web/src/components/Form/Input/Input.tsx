import { classNames } from 'react-gosh'

type TInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.RefObject<HTMLInputElement>
    before?: React.ReactNode
    after?: React.ReactNode
    hasError?: boolean
    inputClassName?: string
}

const Input = (props: TInputProps) => {
    const { className, before, after, hasError, inputClassName, ...rest } = props

    return (
        <div
            className={classNames(
                'flex flex-nowrap items-stretch overflow-hidden',
                'border border-gray-e6edff rounded-lg',
                'focus-within:border-gray-7c8db5',
                hasError ? 'border-rose-600' : null,
                className,
            )}
        >
            {before}
            <input
                className={classNames(
                    'block grow outline-none bg-transparent px-4 py-2',
                    'disabled:text-gray-7c8db5 text-sm',
                    inputClassName,
                )}
                {...rest}
            />
            {after}
        </div>
    )
}

export { Input }
