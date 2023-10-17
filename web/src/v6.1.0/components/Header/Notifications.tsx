import { Menu, Popover } from '@headlessui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell } from '@fortawesome/free-regular-svg-icons'
import { useUserNotificationList } from '../../hooks/notification.hooks'
import moment from 'moment'
import { Link, useNavigate } from 'react-router-dom'
import { ENotificationType } from '../../../types/notification.types'
import { faCheck, faChevronDown, faGear } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'

const getGroupedItems = (items: any[], daoname?: string) => {
    if (daoname) {
        items = items.filter((item) => item.notification.daoname === daoname)
    }

    const groups: { [unixtime: string]: any[] } = {}
    for (const item of items) {
        const created_at = moment(item.created_at)
        const key = moment({ day: created_at.date(), month: created_at.month() })
            .unix()
            .toString()

        const found = Object.keys(groups).find((k) => k === key)
        if (!found) {
            groups[key] = []
        }
        groups[key].push(item)
    }
    return groups
}

const Notifications = () => {
    const navigate = useNavigate()
    const { data, setFilters, updateUserNotification } = useUserNotificationList()
    const dao_selected = data.daolist.find((v) => !!v.selected)?.daoname
    const groups = getGroupedItems(data.items, dao_selected)

    const onFilterByDaoClick = (daoname?: string) => {
        setFilters({ daoname })
    }

    const onItemClick = (item: any) => {
        let link = `/o/${item.notification.daoname}`
        if (item.notification.type === ENotificationType.DAO_EVENT_CREATED) {
            link += '/events'
        }
        updateUserNotification(item.id, { is_read: true })
        navigate(link)
    }

    return (
        <AnimatePresence mode="wait">
            <Popover as="div" className="md:relative">
                <Popover.Button
                    as={Button}
                    variant="custom"
                    className="relative !px-2 text-gray-53596d outline-none"
                >
                    {data.unread > 0 && (
                        <div className="absolute left-1/2 top-0">
                            <div className="rounded-3xl p-1.5 py-1 bg-red-ff3b30 text-[0.6rem] text-white leading-none">
                                {data.unread > 99 ? '99+' : data.unread}
                            </div>
                        </div>
                    )}
                    <FontAwesomeIcon icon={faBell} size="xl" />
                </Popover.Button>

                <Popover.Panel
                    as={motion.div}
                    className="absolute right-0 mt-2 z-1 w-screen max-w-lg px-5 md:px-0"
                    initial={{ opacity: 0, translateY: '0.25rem' }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: '0.25rem' }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="rounded-xl shadow-sm shadow-[#7c8db5]/5 border border-gray-e6edff bg-white p-4">
                        <Menu as="div" className="inline-block mb-3">
                            <Menu.Button>
                                {({ open }) => (
                                    <>
                                        {dao_selected || 'All notifications'}
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            size="xs"
                                            className={classNames(
                                                'ml-2 transition-all duration-200',
                                                open ? 'rotate-180' : 'rotate-0',
                                            )}
                                        />
                                    </>
                                )}
                            </Menu.Button>
                            <Menu.Items
                                as={motion.div}
                                className="absolute left-4 mt-2 z-10 w-fit max-w-1/2"
                                initial={{ opacity: 0, translateY: '0.25rem' }}
                                animate={{ opacity: 1, translateY: 0 }}
                                exit={{ opacity: 0, translateY: '0.25rem' }}
                                transition={{ duration: 0.2 }}
                            >
                                <div
                                    className="rounded-xl shadow-sm shadow-[#7c8db5]/5
                                    border border-gray-e6edff bg-white p-2"
                                >
                                    <Menu.Item
                                        as="div"
                                        className="text-sm p-2 hover:bg-gray-fafafd cursor-pointer rounded-lg"
                                        onClick={() => onFilterByDaoClick()}
                                    >
                                        <FontAwesomeIcon
                                            icon={faBell}
                                            fixedWidth
                                            className="mr-2 text-gray-7c8db5"
                                        />
                                        All
                                    </Menu.Item>
                                    {data.daolist.map((item, index) => (
                                        <Menu.Item
                                            key={index}
                                            as="div"
                                            className="text-sm p-2 hover:bg-gray-fafafd cursor-pointer rounded-lg"
                                            onClick={() =>
                                                onFilterByDaoClick(item.daoname)
                                            }
                                        >
                                            {item.selected && (
                                                <FontAwesomeIcon
                                                    icon={faCheck}
                                                    fixedWidth
                                                    className="mr-2 text-gray-7c8db5"
                                                />
                                            )}
                                            {item.daoname}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </Menu.Items>
                        </Menu>

                        <div className="flex flex-col gap-y-8 max-h-screen md:max-h-[25rem] overflow-y-auto py-3">
                            {!Object.keys(groups).length && (
                                <div className="py-6 text-gray-53596d text-center">
                                    You don't have
                                    <br />
                                    notifications yet
                                </div>
                            )}

                            {Object.keys(groups)
                                .sort((a, b) => parseInt(b) - parseInt(a))
                                .map((key) => (
                                    <div key={key}>
                                        <h4 className="px-1 text-sm text-gray-53596d mb-2">
                                            {moment.unix(parseInt(key)).format('MMMM D')}
                                        </h4>
                                        <div className="flex flex-col">
                                            {groups[key].map((item, index) => (
                                                <Popover.Button
                                                    as="div"
                                                    key={index}
                                                    className="px-1 py-2 text-sm flex flex-nowrap items-center gap-x-4 rounded-lg
                                                        cursor-pointer hover:bg-gray-fafafd transition-colors duration-200"
                                                    onClick={() => onItemClick(item)}
                                                >
                                                    <div className="grow">
                                                        {item.notification.meta.label} in{' '}
                                                        <span className="text-blue-2b89ff">
                                                            {item.notification.daoname}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-53596d whitespace-nowrap">
                                                        {moment(item.created_at).format(
                                                            'HH:mm',
                                                        )}
                                                        {!item.is_read && (
                                                            <div className="inline-block w-2 h-2 rounded-full bg-red-ff3b30 ml-2" />
                                                        )}
                                                    </div>
                                                </Popover.Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="pt-3 border-t border-t-gray-e6edff text-center">
                            <Popover.Button
                                as={Link}
                                to="/a/settings/notifications"
                                className="text-gray-7c8db5 text-sm hover:text-black transition-colors duration-200"
                            >
                                <FontAwesomeIcon icon={faGear} className="mr-2" />
                                Setup notifications
                            </Popover.Button>
                        </div>
                    </div>
                </Popover.Panel>
            </Popover>
        </AnimatePresence>
    )
}

export { Notifications }
