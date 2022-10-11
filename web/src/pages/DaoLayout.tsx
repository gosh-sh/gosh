import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import Spinner from '../components/Spinner'
import { userPersistAtom, classNames, useDao, TDao } from 'react-gosh'
import { IGoshDaoAdapter, IGoshWallet } from 'react-gosh/dist/gosh/interfaces'

export type TDaoLayoutOutletContext = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const DaoLayout = () => {
    const { daoName } = useParams()
    const dao = useDao(daoName!)
    const [isReady, setIsReady] = useState<boolean>(false)

    const tabs = [
        { to: `/o/${daoName}`, title: 'Overview', public: true },
        { to: `/o/${daoName}/repos`, title: 'Repositories', public: true },
        { to: `/o/${daoName}/events`, title: 'Events', public: true },
        { to: `/o/${daoName}/settings`, title: 'Settings', public: false },
    ]

    useEffect(() => {
        if (!dao.isFetching) setIsReady(true)
    }, [dao.isFetching])

    return (
        <div className="container container--full my-10">
            <h1 className="mb-6 px-5 sm:px-0">
                <Link to={`/o/${daoName}`} className="font-semibold text-2xl">
                    {daoName}
                </Link>
            </h1>

            {!dao.errors.length && !isReady && (
                <div className="text-gray-606060 px-5 sm:px-0">
                    <Spinner className="mr-3" />
                    Loading organization...
                </div>
            )}

            {!!dao.errors.length && (
                <div className="p-3 bg-rose-600 text-white rounded">
                    <ul>
                        {dao.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {isReady && !dao.errors.length && (
                <>
                    <div className="flex gap-x-6 mb-6 px-5 sm:px-0 overflow-x-auto no-scrollbar">
                        {tabs
                            .filter((item) =>
                                !dao.details?.isAuthMember ? item.public : item,
                            )
                            .map((item, index) => (
                                <NavLink
                                    key={index}
                                    to={item.to}
                                    end={index === 0}
                                    className={({ isActive }) =>
                                        classNames(
                                            'text-base text-gray-050a15/50 hover:text-gray-050a15 py-1.5 px-2',
                                            isActive
                                                ? '!text-gray-050a15 border-b border-b-gray-050a15'
                                                : null,
                                        )
                                    }
                                >
                                    {item.title}
                                </NavLink>
                            ))}
                    </div>

                    <Outlet context={{ dao }} />
                </>
            )}
        </div>
    )
}

export default DaoLayout
