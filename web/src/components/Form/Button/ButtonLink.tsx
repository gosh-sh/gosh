import { classNames } from 'react-gosh'
import { Link, LinkProps } from 'react-router-dom'

type TButtonLinkProps = LinkProps

const ButtonLink = (props: TButtonLinkProps) => {
    const { className, children, ...rest } = props

    return (
        <Link
            className={classNames(
                'bg-black text-white rounded-lg',
                'text-sm text-center whitespace-nowrap',
                'border border-transparent',
                'py-2 px-4',
                'hover:text-white/75',
                'disabled:text-gray-7c8db5 disabled:bg-gray-fafafd',
                className,
            )}
            {...rest}
        >
            {children}
        </Link>
    )
}

export { ButtonLink }
