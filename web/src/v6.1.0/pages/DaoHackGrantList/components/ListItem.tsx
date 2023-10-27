import { Link } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import { TGoshRepositoryListItem } from '../../../types/repository.types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeFork } from '@fortawesome/free-solid-svg-icons'
import CopyClipboard from '../../../../components/CopyClipboard'
import { shortString } from '../../../../utils'
import Skeleton from '../../../../components/Skeleton'
import { faClock } from '@fortawesome/free-regular-svg-icons'
import { Badge, BadgeTag } from '../../../components/Badge'

const ListItemSkeleton = () => {
    return (
        <Skeleton className="p-4" skeleton={{ height: 40 }}>
            <rect x="0" y="0" rx="6" ry="6" width="30%" height="20" />
            <rect x="0" y="30" rx="4" ry="4" width="180" height="10" />
        </Skeleton>
    )
}

type TRepositoryListItemProps = {
    daoName: string
    daoLink?: boolean
    item: TGoshRepositoryListItem
}

const ListItem = (props: TRepositoryListItemProps) => {
    const { daoName, item, daoLink = false } = props

    return (
        <div className="p-4">
            <div className="flex items-start divide-x text-xs -mx-2">
                <div className="px-2">
                    <FontAwesomeIcon icon={faClock} className="mr-1.5" />
                    Ongoing 1 day 14 hours left
                </div>
                <div className="px-2">16 Participants</div>
            </div>
            <div className="mt-2.5 flex items-center flex-wrap gap-2">
                <div>
                    <Link
                        className="text-xl font-medium text-blue-2b89ff"
                        to={`/o/${daoName}/hacksgrants/${item.account?.address}`}
                    >
                        {item.name}
                    </Link>
                </div>
                <div>
                    <Badge className="bg-blue-2b89ff" content="Hackaton" />
                </div>
                <div className="grow flex items-center justify-end gap-2">
                    {['ai', 'web3', 'python'].map((tag, index) => (
                        <BadgeTag key={index} content={tag} />
                    ))}
                </div>
            </div>

            {item.description && (
                <div className="mt-2.5 text-sm text-gray-53596d">{item.description}</div>
            )}

            <div className="flex gap-4 mt-5 justify-between">
                <div className="grow">
                    <div className="text-xl">
                        10,000 <span className="text-sm">Prize pool</span>
                    </div>
                </div>
                <CopyClipboard
                    className="text-xs text-gray-7c8db5"
                    componentProps={{
                        text: item.account?.address || '',
                    }}
                    label={
                        <span
                            data-tooltip-id="common-tip"
                            data-tooltip-content="Blockchain address"
                        >
                            {shortString(item.account?.address || '')}
                        </span>
                    }
                />
            </div>
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

export { ListItem, ListItemSkeleton }
