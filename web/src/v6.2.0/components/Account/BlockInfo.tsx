import classNames from 'classnames'

type TBlockInfoProps = React.HTMLAttributes<HTMLDivElement> & {
    title: string
    description?: string
}

const BlockInfo = (props: TBlockInfoProps) => {
    const { title, description, children, className } = props

    return (
        <div
            className={classNames(
                'flex flex-wrap gap-x-6 gap-y-4 items-center',
                className,
            )}
        >
            <div className="basis-64">
                <h3 className="font-medium mb-1.5">{title}</h3>
                {children}
            </div>
            <div className="text-gray-53596d text-sm">{description}</div>
        </div>
    )
}

export { BlockInfo }
