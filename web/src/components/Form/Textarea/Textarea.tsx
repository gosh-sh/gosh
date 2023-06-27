import classNames from 'classnames'

type TTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    hasError?: boolean
}

const Textarea = (props: TTextareaProps) => {
    const { className, hasError, ...rest } = props

    return (
        <div
            className={classNames(
                'flex flex-nowrap items-stretch overflow-hidden',
                'border border-border-gray-e6edff rounded-lg',
                'focus-within:border-gray-7c8db5',
                hasError ? 'border-rose-600' : null,
                className,
            )}
        >
            <textarea
                className={classNames(
                    'block grow outline-none bg-transparent px-4 py-2',
                    'disabled:text-gray-7c8db5 text-sm',
                )}
                {...rest}
            />
        </div>
    )
}

export { Textarea }
