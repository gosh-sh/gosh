import { useEffect, useState } from 'react'
import {
    faCode,
    faCodePullRequest,
    faCube,
    faWrench,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { classNames, useRepo, TWalletDetails, TDao, useRepoBranches } from 'react-gosh'
import {
    IGoshDaoAdapter,
    IGoshRepositoryAdapter,
    IGoshWallet,
} from 'react-gosh/dist/gosh/interfaces'

export type TRepoLayoutOutletContext = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    repo: IGoshRepositoryAdapter
    wallet?: {
        instance: IGoshWallet
        details: TWalletDetails
    }
}

const RepoLayout = () => {
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, adapter, isFetching } = useRepo(daoName!, repoName!)
    const { updateBranches } = useRepoBranches(adapter)
    const [isReady, setIsReady] = useState<boolean>(false)

    const tabs = [
        {
            to: `/o/${daoName}/r/${repoName}/tree/${branchName}`,
            title: 'Code',
            icon: faCode,
            public: true,
        },
        {
            to: `/o/${daoName}/r/${repoName}/pull`,
            title: 'Pull request',
            icon: faCodePullRequest,
            public: false,
        },
        {
            to: `/o/${daoName}/r/${repoName}/upgrade`,
            title: 'Upgrade',
            icon: faWrench,
            public: false,
        },
    ]

    if (process.env.REACT_APP_ISDOCKEREXT === 'true') {
        tabs.push({
            to: `/o/${daoName}/r/${repoName}/build/${branchName}`,
            title: 'Build image',
            icon: faCube,
            public: false,
        })
    }

    useEffect(() => {
        const _setup = async () => {
            if (isFetching) return

            await updateBranches()
            console.debug('UPDATE BRANCHES')
            setIsReady(true)
        }

        _setup()
    }, [isFetching, updateBranches])

    return (
        <div className="container container--full my-10">
            <h1 className="flex items-center mb-6 px-5 sm:px-0">
                <Link
                    to={`/o/${daoName}`}
                    className="font-semibold text-xl hover:underline"
                >
                    {daoName}
                </Link>
                <span className="ml-2 align-super text-sm font-normal">
                    {dao.details?.version}
                </span>

                <span className="mx-2">/</span>

                <Link
                    to={`/o/${daoName}/r/${repoName}`}
                    className="font-semibold text-xl hover:underline"
                >
                    {repoName}
                </Link>
                <span className="ml-2 align-super text-sm font-normal">
                    {adapter?.getVersion()}
                </span>
            </h1>

            {!isReady && (
                <div className="text-gray-606060 px-5 sm:px-0">
                    <Spinner className="mr-3" />
                    Loading repository...
                </div>
            )}

            {isReady && (
                <>
                    <div className="flex gap-x-6 mb-6 px-5 sm:px-0">
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
                                    <FontAwesomeIcon
                                        icon={item.icon}
                                        size="sm"
                                        className="mr-2"
                                    />
                                    {item.title}
                                </NavLink>
                            ))}
                    </div>

                    <Outlet context={{ dao, repo: adapter }} />
                </>
            )}
        </div>
    )
}

export default RepoLayout
