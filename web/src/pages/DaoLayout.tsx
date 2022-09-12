import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import Spinner from '../components/Spinner'
import {
    IGoshDao,
    IGoshWallet,
    userPersistAtom,
    classNames,
    useDao,
    TDaoDetails,
    useWallet,
    TWalletDetails,
} from 'react-gosh'

export type TDaoLayoutOutletContext = {
    dao: {
        instance: IGoshDao
        details: TDaoDetails
    }
    wallet?: {
        instance: IGoshWallet
        details: TWalletDetails
    }
}

const DaoLayout = () => {
    const userStatePersist = useRecoilValue(userPersistAtom)
    const { daoName } = useParams()
    const dao = useDao(daoName)
    const wallet = useWallet(dao.instance)
    const [isReady, setIsReady] = useState<boolean>(false)

    const tabs = [
        { to: `/${daoName}`, title: 'Overview', public: true },
        { to: `/${daoName}/repos`, title: 'Repositories', public: true },
        { to: `/${daoName}/events`, title: 'Events', public: true },
        { to: `/${daoName}/settings`, title: 'Settings', public: false },
    ]

    useEffect(() => {
        const walletAwaited =
            !userStatePersist.phrase || (userStatePersist.phrase && wallet)
        if (dao.instance && walletAwaited) setIsReady(true)
    }, [dao.instance, userStatePersist.phrase, wallet])

    return (
        <div className="container container--full my-10">
            <h1 className="mb-6 px-5 sm:px-0">
                <Link to={`/${daoName}`} className="font-semibold text-2xl">
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

            {isReady && (
                <>
                    <div className="flex gap-x-6 mb-6 px-5 sm:px-0 overflow-x-auto no-scrollbar">
                        {tabs
                            .filter((item) => (!wallet ? item.public : item))
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

                    <Outlet context={{ dao, wallet }} />
                </>
            )}
        </div>
    )
}

export default DaoLayout
