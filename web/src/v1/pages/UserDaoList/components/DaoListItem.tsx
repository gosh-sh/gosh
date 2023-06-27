import { useNavigate } from 'react-router-dom'
import { getIdenticonAvatar } from '../../../../helpers'
import { TDaoListItem } from '../../../types/dao.types'
import classNames from 'classnames'
import Spinner from '../../../../components/Spinner/Spinner'

type TDaoListItemProps = React.HTMLAttributes<HTMLDivElement> & {
    item: TDaoListItem
}

const DaoListItem = (props: TDaoListItemProps) => {
    const { className, item } = props
    const navigate = useNavigate()

    const onItemClick = () => {
        if (!item.onboarding) {
            navigate(`/o/${item.name}`)
        }
    }

    return (
        <div
            className={classNames(
                'p-5 border border-gray-e6edff rounded-xl',
                'hover:bg-gray-e6edff/20',
                !item.onboarding ? 'cursor-pointer' : null,
                className,
            )}
            onClick={onItemClick}
        >
            <div className="row !flex-nowrap">
                <div className="col overflow-hidden">
                    <div className="mb-2 truncate">
                        <h1 className="text-xl font-medium leading-5 capitalize">
                            {item.name}
                        </h1>
                    </div>
                    <div className="text-gray-7c8db5 text-xs font-light">
                        {item.description}
                    </div>
                    {item.onboarding && (
                        <div className="mt-3 text-gray-53596d text-xs">
                            <Spinner className="mr-2" />
                            Loading repos ({item.onboarding.length} left)
                        </div>
                    )}
                </div>
                <div className="col !grow-0">
                    <div className="overflow-hidden rounded-xl w-12 md:w-16 lg:w-20">
                        <img
                            src={getIdenticonAvatar({ seed: item.name }).toDataUriSync()}
                            alt=""
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {!!item.tags?.length && (
                <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-7c8db5">
                    {item.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="border border-gray-e6edff rounded px-2"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

export default DaoListItem
