import { classNames } from 'react-gosh'
import Spinner from '../../Spinner'

type TButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean
    variant?: 'default' | 'custom' | 'outline-danger'
}

const styles: { [key: string]: string[] } = {
    base: [
        'text-sm text-center whitespace-nowrap',
        'border border-transparent rounded-lg',
        'py-2 px-4',
        'disabled:pointer-events-none',
    ],
    default: ['bg-black text-white hover:text-white/75 disabled:text-gray-7c8db5'],
    custom: [],
    'outline-danger': [
        'bg-white text-red-ff3b30',
        'border-red-ff3b30',
        'hover:bg-red-ff3b30 hover:text-white',
        'disabled:border-gray-e6edff disabled:text-gray-7c8db5',
    ],
}

const Button = (props: TButtonProps) => {
    const {
        isLoading,
        className,
        children,
        disabled,
        variant = 'default',
        ...rest
    } = props

    return (
        <button
            className={classNames(...styles.base, ...styles[variant], className)}
            {...rest}
            disabled={disabled || isLoading}
        >
            {isLoading && <Spinner className="mr-2" />}
            {children}
        </button>
    )
}

export { Button }
