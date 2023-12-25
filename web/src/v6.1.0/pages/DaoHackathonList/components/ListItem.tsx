import { faClock } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import CopyClipboard from '../../../../components/CopyClipboard'
import Skeleton from '../../../../components/Skeleton'
import { shortString } from '../../../../utils'
import { HackathonTypeBadge } from '../../../components/Hackathon'
import { HackathonStatus } from '../../../components/Hackathon/Status'
import { useHackathon } from '../../../hooks/hackathon.hooks'
import { THackathonDetails } from '../../../types/hackathon.types'

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
  item: THackathonDetails
}

const ListItem = (props: TRepositoryListItemProps) => {
  const { dao_name, item } = props
  const { hackathon } = useHackathon({ repo_name: item.name, initialize: true })

  return (
    <div className="p-4">
      <div className="flex items-start divide-x text-xs -mx-2">
        {hackathon?.metadata.is_fetched ? (
          <>
            <div className="px-2">
              <FontAwesomeIcon icon={faClock} className="mr-1.5" />
              <HackathonStatus dates={hackathon.metadata.dates} />
            </div>
            <div className="px-2">
              {item.participants.items.length.toLocaleString()} Participants
            </div>
          </>
        ) : (
          <Skeleton className="px-2" skeleton={{ height: 8 }}>
            <rect x="0" y="0" rx="6" ry="6" width="100%" height="8" />
          </Skeleton>
        )}
      </div>
      <div className="mt-2.5 flex items-center flex-wrap gap-2">
        <div>
          <Link
            className="text-xl font-medium text-blue-2b89ff"
            to={`/o/${dao_name}/hacksgrants/${item.name}`}
          >
            {hackathon?.metadata.title || item.name}
          </Link>
        </div>
        <div>
          <HackathonTypeBadge type={item.type} />
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
          {hackathon?.metadata.is_fetched ? (
            <div className="text-xl">
              {hackathon?.metadata.prize?.total.toLocaleString()}{' '}
              <span className="text-sm">Prize pool</span>
            </div>
          ) : (
            <Skeleton skeleton={{ height: 8 }}>
              <rect x="0" y="0" rx="6" ry="6" width="30%" height="8" />
            </Skeleton>
          )}
        </div>
        <CopyClipboard
          className="text-xs text-gray-7c8db5"
          componentProps={{ text: item.account.address }}
          label={
            <span data-tooltip-id="common-tip" data-tooltip-content="Blockchain address">
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
