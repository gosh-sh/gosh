import { classNames } from 'react-gosh'
import Spinner from '../../Spinner'

type TButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean
    variant?: 'default' | 'custom' | 'outline-success'
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

    const styles = [
        'text-sm text-center whitespace-nowrap',
        'border border-transparent rounded-lg',
        'py-2 px-4',
        'disabled:pointer-events-none',
    ]

    if (variant === 'default') {
        styles.push('bg-black text-white hover:text-white/75 disabled:text-gray-7c8db5')
    }

    return (
        <button
            className={classNames(...styles, className)}
            {...rest}
            disabled={disabled || isLoading}
        >
            {isLoading && <Spinner className="mr-2" />}
            {children}
        </button>
    )
}

export { Button }
