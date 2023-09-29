import React from 'react'
import { Menu, Transition } from '@headlessui/react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { getIdenticonAvatar } from '../../../helpers'
import { useUser } from '../../hooks/user.hooks'

const DropdownMenu = () => {
    const user = useUser()
    const items = [
        { to: '/a/orgs', title: 'Organizations', className: 'text-gray-050a15' },
        { to: '/a/settings', title: 'Settings', className: 'text-gray-050a15' },
        { to: '/a/bridge', title: 'Ethereum', className: 'text-gray-050a15' },
        {
            to: '',
            title: 'Sign out',
            className: 'text-red-ff3b30',
            onClick: user.signout,
        },
    ]

    return (
        <Menu as="div" className="relative">
            <Menu.Button className="flex flex-nowrap items-center text-gray-53596d gap-3">
                {({ open }) => (
                    <>
                        <div className="w-8 border border-gray-e6edff rounded-full overflow-hidden">
                            <img
                                src={getIdenticonAvatar({
                                    seed: user.persist.profile,
                                    radius: 50,
                                }).toDataUriSync()}
                                alt=""
                                className="w-full"
                            />
                        </div>
                        <div className="hidden md:block">{user.persist.username}</div>
                        <div>
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                size="sm"
                                className={classNames(
                                    'transition-all',
                                    open ? 'rotate-180' : null,
                                )}
                            />
                        </div>
                    </>
                )}
            </Menu.Button>
            <Transition
                as={React.Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute origin-top-right right-0 bg-white border border-gray-e6edff rounded-lg mt-2 z-50 py-2">
                    {items.map((item, index) => (
                        <Menu.Item key={index}>
                            {({ active }) => (
                                <Link
                                    to={item.to}
                                    className={classNames(
                                        'block py-1 px-4 text-gray-53596d hover:text-black',
                                        active ? 'text-black' : null,
                                        item.className,
                                    )}
                                    onClick={item.onClick}
                                >
                                    {item.title}
                                </Link>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Items>
            </Transition>
        </Menu>
    )
}

export default DropdownMenu
