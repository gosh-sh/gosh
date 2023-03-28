import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { classNames, useDao, TDao, shortString } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import SideMenuContainer from '../components/SideMenuContainer'
import Loader from '../components/Loader'
import CopyClipboard from '../components/CopyClipboard'
import ReactTooltip from 'react-tooltip'
import { getIdenticonAvatar } from '../helpers'
import { DaoNotification } from '../components/Dao'

export type TDaoLayoutOutletContext = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const DaoLayout = () => {
    const { daoName } = useParams()
    const dao = useDao(daoName!)
    const [description, setDescription] = useState<string | null>()
    const [isReady, setIsReady] = useState<boolean>(false)

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoName}`, title: 'Overview', order: 0 },
            { to: `/o/${daoName}/events`, title: 'DAO', order: 1 },
            { to: `/o/${daoName}/repos`, title: 'Repositories', order: 2 },
            { to: `/o/${daoName}/members`, title: 'Members', order: 3 },
        ]

        if (dao.details?.isAuthMember || dao.details?.isAuthLimited) {
            if (dao.details?.version === '1.0.0') {
                tabs.push({ to: `/o/${daoName}/wallet`, title: 'Wallet', order: 4 })
            }
        }

        if (dao.details?.isAuthMember) {
            tabs.push({ to: `/o/${daoName}/settings`, title: 'Settings', order: 7 })
            if (dao.details?.version !== '1.0.0') {
                // tabs.push({ to: `/o/${daoName}/topics`, title: 'Topics', order: 6 })
            }
        }

        if (dao.details?.version !== '1.0.0') {
            tabs.push({ to: `/o/${daoName}/tasks`, title: 'Tasks', order: 5 })
        }

        return tabs.sort((a, b) => a.order - b.order)
    }

    const getDaoShortDescription = useCallback(async () => {
        if (dao.adapter) {
            const content = await dao.adapter.getShortDescription()
            setDescription(content)
        }
    }, [dao.adapter])

    useEffect(() => {
        if (!dao.isFetching) {
            getDaoShortDescription()
            setIsReady(true)
        }
    }, [dao.isFetching, getDaoShortDescription])

    return (
        <SideMenuContainer>
            <div className="flex flex-nowrap gap-x-4 mb-6">
                <div className="w-20 overflow-hidden rounded-lg">
                    <img
                        src={getIdenticonAvatar({ seed: daoName }).toDataUriSync()}
                        className="w-full"
                        alt=""
                    />
                </div>
                <div>
                    <h1 className="mb-2">
                        <Link
                            to={`/o/${daoName}`}
                            className="font-medium text-2xl capitalize"
                        >
                            {daoName}
                        </Link>
                        <span
                            className="mx-2 align-super text-xs font-normal text-gray-7c8db5"
                            data-tip="DAO version"
                        >
                            {dao.details?.version}
                        </span>
                        {dao.details?.tags?.map((tag, index) => (
                            <span
                                key={index}
                                className={classNames(
                                    'mx-1 border border-gray-e6edff rounded px-2',
                                    'text-xs text-gray-7c8db5',
                                )}
                            >
                                #{tag}
                            </span>
                        ))}
                    </h1>
                    <div className="mb-2 text-sm">
                        {!description && dao.details?.isAuthMember && (
                            <>
                                Place description.txt to main branch of{' '}
                                {dao.details.hasRepoIndex ? (
                                    <Link
                                        to={`/o/${dao.details.name}/r/_index`}
                                        className="text-blue-348eff"
                                    >
                                        _index
                                    </Link>
                                ) : (
                                    '_index'
                                )}{' '}
                                repo to add short description
                            </>
                        )}
                        {!!description && description}
                    </div>
                    {dao.adapter && (
                        <CopyClipboard
                            className="text-xs text-gray-7c8db5"
                            label={
                                <span data-tip="DAO address">
                                    {shortString(dao.adapter.getAddress())}
                                    <ReactTooltip clickable />
                                </span>
                            }
                            componentProps={{
                                text: dao.adapter.getAddress(),
                            }}
                        />
                    )}
                </div>
            </div>

            {!dao.errors.length && !isReady && <Loader>Loading organization...</Loader>}
            {!!dao.errors.length && (
                <div className="p-3 bg-red-ff3b30 text-white rounded-xl">
                    <ul>
                        {dao.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}
            {isReady && !dao.errors.length && (
                <>
                    {dao.details && dao.adapter && (
                        <div className="mb-6">
                            <DaoNotification
                                dao={{ details: dao.details, adapter: dao.adapter }}
                            />
                        </div>
                    )}

                    <div
                        className={classNames(
                            'flex gap-x-8 mb-6 overflow-x-auto no-scrollbar',
                            'border-b border-b-gray-e6edff',
                        )}
                    >
                        {getTabs().map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.to}
                                end={index === 0}
                                className={({ isActive }) =>
                                    classNames(
                                        'text-gray-7c8db5 pt-1.5 pb-4',
                                        'border-b-4 border-b-transparent',
                                        'hover:text-black hover:border-b-black',
                                        isActive ? '!text-black border-b-black' : null,
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
        </SideMenuContainer>
    )
}

export default DaoLayout
