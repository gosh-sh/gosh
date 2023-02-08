import { Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { classNames } from 'react-gosh'
import { TDaoLayoutOutletContext } from './DaoLayout'

const DaoSettingsLayout = () => {
    const { daoName } = useParams()
    const context = useOutletContext<TDaoLayoutOutletContext>()

    const tabs = [
        { to: `/o/${daoName}/settings/wallet`, title: 'Wallet' },
        { to: `/o/${daoName}/settings/members`, title: 'Members' },
        { to: `/o/${daoName}/settings/upgrade`, title: 'Upgrade' },
    ]

    if (!context.dao.details.isAuthenticated) return <Navigate to={`/o/${daoName}`} />
    return (
        <div className="container container--full mt-12 mb-5">
            <div className="bordered-block px-7 py-8">
                <h1 className="font-semibold text-2xl mb-5">DAO settings</h1>

                <div className="flex gap-x-8 gap-y-8 flex-wrap md:flex-nowrap">
                    <div className="basis-full md:basis-1/5 flex flex-col gap-y-1">
                        {tabs.map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.to}
                                className={({ isActive }) =>
                                    classNames(
                                        'py-2 text-base text-gray-050a15/50 hover:text-gray-050a15',
                                        isActive ? '!text-gray-050a15' : null,
                                    )
                                }
                            >
                                {item.title}
                            </NavLink>
                        ))}
                    </div>
                    <div className="basis-full md:basis-4/5 overflow-hidden">
                        <Outlet context={context} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DaoSettingsLayout
