import classNames from 'classnames'
import { Link, LinkProps } from 'react-router-dom'

type TButtonLinkProps = LinkProps & {
    variant?: 'default' | 'custom' | 'outline-danger' | 'outline-secondary'
    size?: 'default' | 'sm' | 'lg' | 'xl'
    disabled?: boolean
}

const styles: { [key: string]: string[] } = {
    base: [
        'text-center whitespace-nowrap',
        'border border-transparent rounded-lg',
        'disabled:pointer-events-none',
    ],
    default: ['bg-black text-white hover:text-white/75 disabled:text-gray-7c8db5'],
    custom: [],
    'outline-danger': [
        'bg-white text-red-ff3b30',
        '!border-red-ff3b30',
        'hover:bg-red-ff3b30 hover:text-white',
        'disabled:!border-gray-e6edff disabled:text-gray-e6edff',
    ],
    'outline-secondary': [
        'bg-gray-fafafd text-gray-53596d',
        '!border-gray-e6edff',
        'hover:text-black',
        'disabled:text-gray-e6edff',
    ],
}

const sizes: { [key: string]: string[] } = {
    default: ['text-sm py-2 px-4'],
    sm: ['text-xs py-1 px-2'],
    lg: ['text-sm px-8 py-2'],
    xl: ['text-sm px-8 py-2.5'],
}

const ButtonLink = (props: TButtonLinkProps) => {
    const {
        className,
        children,
        variant = 'default',
        size = 'default',
        disabled,
        ...rest
    } = props

    return (
        <Link
            className={classNames(
                ...styles.base,
                ...styles[variant],
                ...sizes[size],
                disabled ? 'opacity-50 pointer-events-none' : null,
                className,
            )}
            {...rest}
        >
            {children}
        </Link>
    )
}

export { ButtonLink }
