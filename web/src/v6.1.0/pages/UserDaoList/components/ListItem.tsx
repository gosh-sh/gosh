import { useNavigate } from 'react-router-dom'
import { getIdenticonAvatar } from '../../../../helpers'
import { TDaoListItem } from '../../../types/dao.types'
import classNames from 'classnames'
import Spinner from '../../../../components/Spinner/Spinner'
import Skeleton from '../../../../components/Skeleton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins, faUsers } from '@fortawesome/free-solid-svg-icons'
import { Tooltip } from 'react-tooltip'
import { Popover } from '@headlessui/react'
import { faBell, faBellSlash } from '@fortawesome/free-regular-svg-icons'
import { Button, Checkbox } from '../../../../components/Form'
import { ChangeEvent } from 'react'
import { useDaoNotificationSettings } from '../../../hooks/notification.hooks'
import { NotificationType } from '../../../../constants'
import { useUser } from '../../../hooks/user.hooks'
import { AnimatePresence, motion } from 'framer-motion'

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
  const { user } = useUser()
  const { daoSettings, updateDaoSettings } = useDaoNotificationSettings({
    initialize: true,
    daoname: item.name,
  })

  const hasEnabledSettings = Object.values(daoSettings.data?.types || {}).some((v) => !!v)

  const onItemClick = () => {
    if (item.address) {
      navigate(`/o/${item.name}`)
    }
  }

  const onSingleNotificationChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      await updateDaoSettings({
        daoname: item.name,
        types: { [e.target.name]: e.target.checked },
      })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  const onAllNotificationChange = async (enable: boolean) => {
    try {
      const items = Object.keys(NotificationType).map((key) => [key, enable])
      await updateDaoSettings({
        daoname: item.name,
        types: Object.fromEntries(items),
      })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <div
      className={classNames(
        'p-5 border border-gray-e6edff rounded-xl',
        'hover:bg-gray-e6edff/20',
        className,
      )}
    >
      <div
        className={classNames('row !flex-nowrap', item.address ? 'cursor-pointer' : null)}
        test-id={`daoitem-${item.name}`}
        onClick={onItemClick}
      >
        <div className="col overflow-hidden">
          <div className="mb-4 truncate">
            <h1 className="text-xl font-medium capitalize">{item.name}</h1>
          </div>
        </div>
        <div className="col !grow-0">
          <div className="overflow-hidden rounded-xl w-12 md:w-14">
            <img
              src={getIdenticonAvatar({ seed: item.name }).toDataUriSync()}
              alt=""
              className="w-full"
            />
          </div>
        </div>
      </div>
      <div className="mt-4">
        {item.onboarding && (
          <div className="my-3 text-gray-53596d text-sm">
            <Spinner className="mr-2" />
            Loading repos ({item.onboarding.length} left)
          </div>
        )}
        {item.address && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div
              className="text-gray-53596d text-sm"
              data-tooltip-id="common-tip"
              data-tooltip-content="Total supply"
            >
              <FontAwesomeIcon icon={faCoins} className="mr-2" />
              {item.supply.toLocaleString()}
            </div>
            <div
              className="text-gray-53596d text-sm"
              data-tooltip-id="common-tip"
              data-tooltip-content="Members"
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              {item.members.toLocaleString()}
            </div>
            {user.username && (
              <AnimatePresence>
                <Popover as="div" className="grow text-end relative">
                  <Popover.Button
                    as={Button}
                    variant="custom"
                    className="!p-0 text-gray-53596d outline-none"
                  >
                    <FontAwesomeIcon
                      icon={hasEnabledSettings ? faBell : faBellSlash}
                      size="lg"
                    />
                  </Popover.Button>

                  <Popover.Panel
                    as={motion.div}
                    className="absolute right-0 mt-2 rounded-xl shadow-sm shadow-[#7c8db5]/5
                                            border border-gray-e6edff bg-white px-4 py-2 z-1"
                    initial={{ opacity: 0, translateY: '0.25rem' }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: '0.25rem' }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="custom"
                      className="group w-full !px-0 text-start"
                      disabled={daoSettings.isFetching}
                      onClick={() => onAllNotificationChange(true)}
                    >
                      <FontAwesomeIcon
                        icon={faBell}
                        size="xl"
                        fixedWidth
                        className="mr-2 text-gray-7c8db5 group-hover:text-black
                                                    transition-colors duration-200"
                      />
                      All
                    </Button>
                    <div className="my-6 px-0.5 flex flex-col gap-y-4">
                      {Object.keys(NotificationType).map((key) => (
                        <Checkbox
                          key={key}
                          name={key}
                          label={NotificationType[key]}
                          className="!text-sm text-start"
                          checked={!!daoSettings.data?.types[key]}
                          disabled={daoSettings.isFetching}
                          onChange={onSingleNotificationChange}
                        />
                      ))}
                    </div>
                    <Button
                      variant="custom"
                      className="group w-full !px-0 text-start"
                      disabled={daoSettings.isFetching}
                      onClick={() => onAllNotificationChange(false)}
                    >
                      <FontAwesomeIcon
                        icon={faBellSlash}
                        size="xl"
                        fixedWidth
                        className="mr-2 text-gray-7c8db5 group-hover:text-black
                                                    transition-colors duration-200"
                      />
                      Disable notifications
                    </Button>
                  </Popover.Panel>
                </Popover>
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      <Tooltip id="common-tip" clickable />
    </div>
  )
}

export { ListItem, ListItemSkeleton }
