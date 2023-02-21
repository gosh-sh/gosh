import { faUsers } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames, shortString, TDaoListItem } from 'react-gosh'
import { Link } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import emptylogo from '../../assets/images/emptylogo.svg'
import ReactTooltip from 'react-tooltip'

type TDaoListItemProps = {
    className?: string
    item: TDaoListItem
}

const DaoListItem = (props: TDaoListItemProps) => {
    const { className, item } = props

    return (
        <div
            className={classNames(
                'border border-gray-e6edff rounded-xl flex flex-nowrap p-5',
                'hover:bg-gray-e6edff/20',
                className,
            )}
        >
            <div className="overflow-hidden rounded-xl">
                <img src={emptylogo} alt="" className="w-14 h-14 md:w-20 md:h-20" />
            </div>
            <div className="grow pl-4">
                <div className="flex flex-wrap items-center">
                    <div className="mb-1 grow">
                        <Link
                            to={`/o/${item.name}`}
                            className="text-xl font-medium leading-5"
                        >
                            {item.name}
                        </Link>
                        <span className="ml-2 align-super text-sm font-normal text-gray-7c8db5">
                            {item.version}
                        </span>
                    </div>
                    {!!item.tags?.length && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-7c8db5">
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

                <div
                    className={classNames(
                        'flex flex-wrap items-center gap-x-5 gap-y-1 mt-4',
                        'text-gray-7c8db5 text-xs font-light',
                    )}
                >
                    <div data-tip="Members">
                        <FontAwesomeIcon icon={faUsers} className="mr-1" />
                        {item.members?.length}
                    </div>
                    <div>Total supply {item.supply?.total}</div>
                    <CopyClipboard
                        className="grow justify-end"
                        componentProps={{ text: item.address }}
                        label={
                            <span data-tip="DAO address">
                                {shortString(item.address, 6, 6)}
                            </span>
                        }
                    />
                </div>
            </div>
            <ReactTooltip clickable />
        </div>
    )
}

export default DaoListItem
