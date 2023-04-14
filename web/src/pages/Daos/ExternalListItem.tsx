import { classNames } from 'react-gosh'
import emptylogo from '../../assets/images/emptylogo.svg'

type TExternalListItemProps = {
    className?: string
    item: { name: string; repos: string[] }
}

const ExternalListItem = (props: TExternalListItemProps) => {
    const { className, item } = props

    return (
        <div
            className={classNames(
                'p-5 border border-gray-e6edff rounded-xl',
                'hover:bg-gray-e6edff/20',
                className,
            )}
        >
            <div className={classNames('row !flex-nowrap')}>
                <div className="col !grow-0">
                    <div className="overflow-hidden rounded-xl w-12 md:w-16 lg:w-20">
                        <img src={emptylogo} alt="" className="w-full" />
                    </div>
                </div>
                <div className="col overflow-hidden">
                    <div className="mb-3 text-xl font-medium leading-5 truncate">
                        {item.name}
                    </div>
                    <div className="text-xs text-gray-53596d">
                        {item.repos.join(', ')}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExternalListItem
