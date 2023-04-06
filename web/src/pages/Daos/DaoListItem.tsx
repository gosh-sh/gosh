import { faUsers } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames, shortString, TDaoListItem } from 'react-gosh'
import { Link } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import { Tooltip } from 'react-tooltip'
import { getIdenticonAvatar } from '../../helpers'

type TDaoListItemProps = {
    className?: string
    item: TDaoListItem
}

const DaoListItem = (props: TDaoListItemProps) => {
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
                        <img
                            src={getIdenticonAvatar({ seed: item.name }).toDataUriSync()}
                            alt=""
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="col">
                    <div className="mb-3 truncate">
                        <Link
                            to={`/o/${item.name}`}
                            className="text-xl font-medium leading-5 capitalize"
                        >
                            {item.name}
                        </Link>
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

                    <div
                        className={classNames(
                            'flex flex-wrap items-center gap-x-5 gap-y-2',
                            'text-gray-7c8db5 text-xs font-light',
                        )}
                    >
                        <div>Version: {item.version}</div>
                        <div data-tooltip-id="common-tip" data-tooltip-content="Members">
                            <FontAwesomeIcon icon={faUsers} className="mr-1" />
                            {item.members?.length}
                        </div>
                        <div>Total supply: {item.supply?.total.toLocaleString()}</div>
                        <CopyClipboard
                            componentProps={{ text: item.address }}
                            label={
                                <span
                                    data-tooltip-id="common-tip"
                                    data-tooltip-content="DAO address"
                                >
                                    {shortString(item.address, 6, 6)}
                                </span>
                            }
                        />
                    </div>
                </div>
                <Tooltip id="common-tip" clickable />
            </div>
        </div>
    )
}

export default DaoListItem
