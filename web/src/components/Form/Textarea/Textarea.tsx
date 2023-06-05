import { TextareaAutosize } from '@mui/material'
import { classNames } from 'react-gosh'

type TTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    hasError?: boolean
    resize?: boolean
}

const Textarea = (props: TTextareaProps) => {
    const { className, hasError, resize = true, ...rest } = props

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
            <TextareaAutosize
                className={classNames(
                    'block grow outline-none bg-transparent px-4 py-2',
                    'disabled:text-gray-7c8db5 text-sm',
                    !resize ? 'resize-none' : null,
                )}
                {...rest}
            />
        </div>
    )
}

export { Textarea }
