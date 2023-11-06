import { faClock } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import CopyClipboard from '../../../../components/CopyClipboard'
import Skeleton from '../../../../components/Skeleton'
import { shortString } from '../../../../utils'
import { HackatonTypeBadge } from '../../../components/Hackaton'
import { useHackaton } from '../../../hooks/hackaton.hooks'
import { THackatonDetails } from '../../../types/hackaton.types'

const ListItemSkeleton = () => {
    return (
        <Skeleton className="p-4" skeleton={{ height: 40 }}>
            <rect x="0" y="0" rx="6" ry="6" width="30%" height="20" />
            <rect x="0" y="30" rx="4" ry="4" width="180" height="10" />
        </Skeleton>
    )
}

type TRepositoryListItemProps = {
    dao_name: string
    item: THackatonDetails
}

const ListItem = (props: TRepositoryListItemProps) => {
    const { dao_name, item } = props
    const { data } = useHackaton({ repo_name: item.name, initialize: true })

    return (
        <div className="p-4">
            <div className="flex items-start divide-x text-xs -mx-2">
                {data?.metadata.is_fetching ? (
                    <Skeleton className="px-2" skeleton={{ height: 8 }}>
                        <rect x="0" y="0" rx="6" ry="6" width="100%" height="8" />
                    </Skeleton>
                ) : (
                    <>
                        <div className="px-2">
                            <FontAwesomeIcon icon={faClock} className="mr-1.5" />
                            Ongoing 1 day 14 hours left
                        </div>
                        <div className="px-2">
                            {item.participants.length.toLocaleString()} Participants
                        </div>
                    </>
                )}
            </div>
            <div className="mt-2.5 flex items-center flex-wrap gap-2">
                <div>
                    <Link
                        className="text-xl font-medium text-blue-2b89ff"
                        to={`/o/${dao_name}/hacksgrants/${item.name}`}
                    >
                        {data?.metadata.title || item.name}
                    </Link>
                </div>
                <div>
                    <HackatonTypeBadge type={item.type} />
                </div>
                <div className="grow flex items-center justify-end gap-2">
                    {/* TODO: Common tags */}
                </div>
            </div>

            {item.description && (
                <div className="mt-2.5 text-sm text-gray-53596d">{item.description}</div>
            )}

            <div className="flex gap-4 mt-5 justify-between">
                <div className="grow">
                    {data?.metadata.is_fetching ? (
                        <Skeleton skeleton={{ height: 8 }}>
                            <rect x="0" y="0" rx="6" ry="6" width="30%" height="8" />
                        </Skeleton>
                    ) : (
                        <div className="text-xl">
                            {data?.metadata.prize?.total.toLocaleString()}{' '}
                            <span className="text-sm">Prize pool</span>
                        </div>
                    )}
                </div>
                <CopyClipboard
                    className="text-xs text-gray-7c8db5"
                    componentProps={{ text: item.account.address }}
                    label={
                        <span
                            data-tooltip-id="common-tip"
                            data-tooltip-content="Blockchain address"
                        >
                            {shortString(item.account.address)}
                        </span>
                    }
                />
            </div>
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

export { ListItem, ListItemSkeleton }
