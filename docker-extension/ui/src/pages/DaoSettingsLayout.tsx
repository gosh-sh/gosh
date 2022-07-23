import React from "react";
import { NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import { classNames } from "../utils";
import { TDaoLayoutOutletContext } from "./Dao";


const DaoSettingsLayout = () => {
    const { daoName } = useParams();
    const daoContext = useOutletContext<TDaoLayoutOutletContext>();

    const tabs = [
        { to: `/${daoName}/settings/wallet`, title: 'Wallet' },
        { to: `/${daoName}/settings/participants`, title: 'Participants' }
    ];

    return (
        <div className="container mt-12 mb-5">
            <div className="bordered-block px-7 py-8">
                <h1 className="font-semibold text-2xl mb-5">DAO settings</h1>

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
                        <Outlet context={daoContext} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DaoSettingsLayout;
