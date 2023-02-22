import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import {
    classNames,
    useDao,
    TDao,
    shortString,
    AppConfig,
    GoshAdapterFactory,
} from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import SideMenuContainer from '../components/SideMenuContainer'
import emptylogo from '../assets/images/emptylogo.svg'
import Loader from '../components/Loader'
import CopyClipboard from '../components/CopyClipboard'
import ReactTooltip from 'react-tooltip'

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
    const [upgrades, setUpgrades] = useState<
        'isNotLatest' | 'isUpgradeAvailable' | 'isRepoUpgradeNeeded'
    >()

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoName}`, title: 'Overview', order: 0 },
            { to: `/o/${daoName}/events`, title: 'DAO', order: 1 },
            { to: `/o/${daoName}/repos`, title: 'Repositories', order: 2 },
            { to: `/o/${daoName}/members`, title: 'Members', order: 3 },
        ]

        if (dao.details?.isAuthMember || dao.details?.isAuthLimited) {
            tabs.push({ to: `/o/${daoName}/wallet`, title: 'Wallet', order: 4 })
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

    useEffect(() => {
        const _checkUpgrades = async () => {
            if (!isReady || !dao.details) {
                return
            }

            // Check if using latest version of DAO or new version avaiable
            const latest = Object.keys(AppConfig.versions).reverse()[0]
            if (dao.details.version !== latest) {
                const gosh = GoshAdapterFactory.createLatest()
                const newest = await gosh.getDao({
                    name: dao.details.name,
                    useAuth: false,
                })
                if (await newest.isDeployed()) {
                    setUpgrades('isNotLatest')
                } else {
                    setUpgrades('isUpgradeAvailable')
                }
                return
            }

            // Check repositories upgraded flag
            if (!dao.details.isRepoUpgraded) {
                setUpgrades('isRepoUpgradeNeeded')
                return
            }

            // Reset upgrades message
            setUpgrades(undefined)
        }

        _checkUpgrades()
    }, [isReady, dao.details])

    return (
        <SideMenuContainer>
            <div className="flex flex-nowrap gap-x-4 mb-6">
                <div className="w-20 overflow-hidden rounded-lg">
                    <img src={emptylogo} className="w-full" alt="" />
                </div>
                <div>
                    <h1 className="mb-2">
                        <Link to={`/o/${daoName}`} className="font-medium text-2xl">
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
                    {description && <div className="mb-2 text-sm">{description}</div>}
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
                    {upgrades && (
                        <div className="mb-6 py-3 px-5 bg-red-ff3b30 text-white text-sm rounded-xl">
                            {upgrades === 'isNotLatest' && (
                                <>
                                    You are using old version of DAO.
                                    <br />
                                    <button
                                        className="underline"
                                        onClick={() => {
                                            document.location = `/o/${daoName}`
                                        }}
                                    >
                                        Reload
                                    </button>{' '}
                                    page to go to the latest version
                                </>
                            )}
                            {upgrades === 'isUpgradeAvailable' && (
                                <>
                                    New version of DAO available.
                                    <br />
                                    Check if corresponding proposal does not exist and go
                                    to the{' '}
                                    <Link
                                        className="underline"
                                        to={`/o/${daoName}/settings/upgrade`}
                                    >
                                        DAO upgrade
                                    </Link>{' '}
                                    page.
                                </>
                            )}
                            {upgrades === 'isRepoUpgradeNeeded' && (
                                <>
                                    DAO repositories should be upgraded.
                                    <br />
                                    Go to the{' '}
                                    <Link
                                        className="underline"
                                        to={`/o/${daoName}/repos/upgrade`}
                                    >
                                        upgrade
                                    </Link>{' '}
                                    page
                                </>
                            )}
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
