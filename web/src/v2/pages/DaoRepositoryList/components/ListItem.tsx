import { Link } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import { TRepositoryListItem } from '../../../types/repository.types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeFork } from '@fortawesome/free-solid-svg-icons'
import CopyClipboard from '../../../../components/CopyClipboard'
import { shortString } from '../../../../utils'
import Skeleton from '../../../../components/Skeleton'

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
    item: TRepositoryListItem
}

const ListItem = (props: TRepositoryListItemProps) => {
    const { daoName, item, daoLink = false } = props

    return (
        <div className="p-4">
            <div className="flex flex-wrap mb-1">
                {daoLink && (
                    <>
                        <Link className="text-xl font-medium" to={`/o/${daoName}`}>
                            {daoName}
                        </Link>
                        <span className="mx-1">/</span>
                    </>
                )}
                <Link className="text-xl font-medium" to={`/o/${daoName}/r/${item.name}`}>
                    {item.name}
                </Link>
                <span className="ml-2 align-super text-xs text-gray-7c8db5">
                    {item.version}
                </span>
            </div>

            {item.description && <div className="mt-2 text-xs">{item.description}</div>}

            <div className="flex gap-4 mt-3 text-sm text-gray-7c8db5 justify-between">
                <div className="flex gap-4">
                    <div data-tooltip-id="common-tip" data-tooltip-content="Branches">
                        <FontAwesomeIcon icon={faCodeFork} className="mr-1" />
                        {item.branches?.length}
                    </div>
                </div>
                <CopyClipboard
                    className="text-xs"
                    componentProps={{
                        text: item.account?.address || '',
                    }}
                    label={
                        <span
                            data-tooltip-id="common-tip"
                            data-tooltip-content="Repository address"
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
