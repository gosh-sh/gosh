import { ReactNode } from 'react'
import { classNames } from 'react-gosh'

type TUILogProps = {
    children: ReactNode
    className?: string
}

const UILog = (props: TUILogProps) => {
    const { children, className } = props

    return (
        <div
            className={classNames(
                'text-sm text-gray-050a15/70 bg-gray-050a15/5 rounded p-3',
                className,
            )}
        >
            <code className="flex flex-col gap-2">{children}</code>
        </div>
    )
}

export { UILog }
