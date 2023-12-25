import { useNavigate } from 'react-router-dom'
import { getIdenticonAvatar } from '../../../../helpers'
import { TDaoListItem } from '../../../types/dao.types'
import classNames from 'classnames'
import Spinner from '../../../../components/Spinner/Spinner'
import Skeleton from '../../../../components/Skeleton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPiggyBank, faTag, faUsers } from '@fortawesome/free-solid-svg-icons'
import { Tooltip } from 'react-tooltip'

type TListItemSkeletonProps = React.HTMLAttributes<HTMLDivElement>

const ListItemSkeleton = (props: TListItemSkeletonProps) => {
  const { className } = props

  return (
    <Skeleton
      className={classNames('p-5 border border-gray-e6edff rounded-xl', className)}
      skeleton={{ height: 78 }}
    >
      <rect x="78%" y="0" rx="12" ry="12" width="76" height="76" />
      <rect x="0" y="10" rx="6" ry="6" width="60%" height="20" />
      <rect x="0" y="45" rx="4" ry="4" width="60%" height="8" />
      <rect x="0" y="60" rx="4" ry="4" width="60%" height="8" />
    </Skeleton>
  )
}

type TListItemProps = React.HTMLAttributes<HTMLDivElement> & {
  item: TDaoListItem
}

const ListItem = (props: TListItemProps) => {
  const { className, item } = props
  const navigate = useNavigate()

  const onItemClick = () => {
    if (item.address) {
      navigate(`/o/${item.name}`)
    }
  }

  return (
    <div
      className={classNames(
        'p-5 border border-gray-e6edff rounded-xl',
        'hover:bg-gray-e6edff/20',
        item.address ? 'cursor-pointer' : null,
        className,
      )}
      test-id={`daoitem-${item.name}`}
      onClick={onItemClick}
    >
      <div className="row !flex-nowrap">
        <div className="col overflow-hidden">
          <div className="mb-4 truncate">
            <h1 className="text-xl font-medium capitalize">{item.name}</h1>
          </div>
          {item.onboarding && (
            <div className="my-3 text-gray-53596d text-xs">
              <Spinner className="mr-2" />
              Loading repos ({item.onboarding.length} left)
            </div>
          )}
          {item.address && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div
                className="text-gray-53596d text-xs"
                data-tooltip-id="common-tip"
                data-tooltip-content="Version"
              >
                <FontAwesomeIcon icon={faTag} className="mr-2" />
                {item.version}
              </div>
              <div
                className="text-gray-53596d text-xs"
                data-tooltip-id="common-tip"
                data-tooltip-content="Total supply"
              >
                <FontAwesomeIcon icon={faPiggyBank} className="mr-2" />
                {item.supply.toLocaleString()}
              </div>
              <div
                className="text-gray-53596d text-xs"
                data-tooltip-id="common-tip"
                data-tooltip-content="Members"
              >
                <FontAwesomeIcon icon={faUsers} className="mr-2" />
                {item.members.toLocaleString()}
              </div>
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

      <Tooltip id="common-tip" clickable />
    </div>
  )
}

export { ListItem, ListItemSkeleton }
