import { classNames } from 'react-gosh'
import Spinner from '../../Spinner'

type TButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean
}

const Button = (props: TButtonProps) => {
    const { isLoading, className, children, disabled, ...rest } = props

    return (
        <button
            className={classNames(
                'bg-black text-white rounded-lg',
                'text-sm text-center whitespace-nowrap',
                'border border-transparent',
                'py-2 px-4',
                'hover:text-white/75',
                'disabled:text-gray-7c8db5 disabled:bg-gray-fafafd disabled:pointer-events-none',
                className,
            )}
            {...rest}
            disabled={disabled || isLoading}
        >
            {isLoading && <Spinner className="mr-2" />}
            {children}
        </button>
    )
}

export { Button }
