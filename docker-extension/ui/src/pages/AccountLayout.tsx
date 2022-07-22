import React from "react";
import { classNames } from "./../utils";
import { NavLink, Outlet } from "react-router-dom";


const AccountLayout = () => {
    const tabs = [
        { to: '/account/organizations', title: 'Organizations' },
        { to: '/account/settings', title: 'Settings' }
    ];

    return (
        <div className="container mt-12 mb-5">
            <div className="bordered-block px-7 py-8">
                <h1 className="font-semibold text-2xl mb-5">User account</h1>

                <div className="flex gap-x-14 gap-y-8 flex-wrap">
                    <div className="w-full sm:w-1/5 flex flex-col gap-y-1">
                        {tabs.map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.to}
                                className={({ isActive }) => classNames(
                                    'py-2 text-base text-gray-050a15/50 hover:text-gray-050a15',
                                    isActive ? '!text-gray-050a15' : null
                                )}
                            >
                                {item.title}
                            </NavLink>
                        ))}
                    </div>
                    <div className="grow">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountLayout;
