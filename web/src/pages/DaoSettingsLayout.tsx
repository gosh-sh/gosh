import { Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { classNames } from 'react-gosh'
import { TDaoLayoutOutletContext } from './DaoLayout'

const DaoSettingsLayout = () => {
    const { daoName } = useParams()
    const context = useOutletContext<TDaoLayoutOutletContext>()
    const version = context.dao.details.version

    const getTabs = () => {
        const tabs = []

        if (version !== '1.0.0') {
            tabs.push({ to: `/o/${daoName}/settings/setup`, title: 'DAO Set up' })
        }

        tabs.push({ to: `/o/${daoName}/settings/upgrade`, title: 'Upgrade' })
        return tabs
    }

    if (!context.dao.details.isAuthMember) {
        return <Navigate to={`/o/${daoName}`} />
    }
    return (
        <div className="flex gap-x-8 gap-y-8 flex-wrap md:flex-nowrap">
            <div className="basis-full md:basis-1/5 flex flex-col gap-y-1">
                {getTabs().map((item, index) => (
                    <NavLink
                        key={index}
                        to={item!.to}
                        className={({ isActive }) =>
                            classNames(
                                'py-2 text-gray-7c8db5 hover:text-black',
                                isActive ? '!text-black' : null,
                            )
                        }
                    >
                        {item!.title}
                    </NavLink>
                ))}
            </div>
            <div className="basis-full md:basis-4/5 overflow-hidden">
                <Outlet context={context} />
            </div>
        </div>
    )
}

export default DaoSettingsLayout
