import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import {
    classNames,
    useDao,
    TDao,
    shortString,
    useDaoAutoTokenTransfer,
} from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import Loader from '../components/Loader'
import CopyClipboard from '../components/CopyClipboard'
import { Tooltip } from 'react-tooltip'
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
    useDaoAutoTokenTransfer(dao.adapter)
    const [description, setDescription] = useState<{
        isFetching: boolean
        content: string | null
    }>({ isFetching: true, content: null })
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
            setDescription((state) => ({ ...state, isFetching: true }))
            const content = await dao.adapter.getShortDescription()
            setDescription((state) => ({ ...state, isFetching: false, content }))
        }
    }, [dao.adapter])

    useEffect(() => {
        if (!dao.isFetching) {
            getDaoShortDescription()
            setIsReady(true)
        }
    }, [dao.isFetching, getDaoShortDescription])

    return (
        <div className="container py-10">
            <div className="row mb-6">
                <div className="col !grow-0">
                    <div className="overflow-hidden rounded-xl w-12 md:w-16 lg:w-20">
                        <img
                            src={getIdenticonAvatar({ seed: daoName }).toDataUriSync()}
                            className="w-full"
                            alt=""
                        />
                    </div>
                </div>
                <div className="col">
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
                    {!description.isFetching && (
                        <div className="mb-2 text-sm">
                            {!description.content && dao.details?.isAuthMember && (
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
                            {!!description.content && description.content}
                        </div>
                    )}
                    {dao.adapter && (
                        <CopyClipboard
                            className="text-xs text-gray-7c8db5"
                            label={
                                <span
                                    data-tooltip-id="common-tip"
                                    data-tooltip-content="DAO address"
                                >
                                    {shortString(dao.adapter.getAddress())}
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

            <Tooltip id="common-tip" clickable />
        </div>
    )
}

export default DaoLayout
