import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { classNames } from 'web-common/lib/utils';
import { useResetRecoilState } from 'recoil';
import { userStateAtom, userStatePersistAtom } from 'web-common/lib/store/user.state';

const DropdownMenu = () => {
    const resetUserState = useResetRecoilState(userStateAtom);
    const resetUserStatePersist = useResetRecoilState(userStatePersistAtom);
    const items = [
        { to: '/account/orgs', title: 'Organizations', className: 'text-gray-050a15' },
        { to: '/account/repos', title: 'Repositories', className: 'text-gray-050a15' },
        { to: '/account/settings', title: 'Settings', className: 'text-gray-050a15' },
        {
            to: '',
            title: 'Sign out',
            className: 'text-red-dd3a3a',
            onClick: () => {
                resetUserState();
                resetUserStatePersist();
            },
        },
    ];

    return (
        <Menu as="div" className="relative">
            <Menu.Button className="btn btn--header btn--burger icon-burger" />
            <Transition
                as={React.Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="dropdown-menu">
                    {items.map((item, index) => (
                        <Menu.Item key={index}>
                            {({ active }) => (
                                <Link
                                    to={item.to}
                                    className={classNames(
                                        'block my-1 text-lg leading-32px hover:text-white',
                                        active ? 'text-white' : null,
                                        item?.className
                                    )}
                                    onClick={item?.onClick}
                                >
                                    {item.title}
                                </Link>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default DropdownMenu;
