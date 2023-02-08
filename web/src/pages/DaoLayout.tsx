import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { classNames, useDao, TDao, shortString } from 'react-gosh'
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

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoName}`, title: 'Overview' },
            { to: `/o/${daoName}/events`, title: 'DAO' },
            { to: `/o/${daoName}/repos`, title: 'Repositories' },
            { to: `/o/${daoName}/members`, title: 'Members' },
        ]

        if (dao.details?.isAuthMember) {
            tabs.push(
                { to: `/o/${daoName}/settings`, title: 'Settings' },
                { to: `/o/${daoName}/wallet`, title: 'Wallet' },
            )
        }
        if (dao.details?.isAuthLimited) {
            tabs.push({ to: `/o/${daoName}/wallet`, title: 'Wallet' })
        }

        return tabs
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
