import { useEffect, useState } from 'react'
import {
    faCodePullRequest,
    faCube,
    faWrench,
    faCodeBranch,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import {
    classNames,
    useRepo,
    TWalletDetails,
    TDao,
    useBranches,
    TRepository,
    shortString,
    AppConfig,
} from 'react-gosh'
import {
    IGoshDaoAdapter,
    IGoshRepositoryAdapter,
    IGoshWallet,
} from 'react-gosh/dist/gosh/interfaces'
import SideMenuContainer from '../components/SideMenuContainer'
import { faFile } from '@fortawesome/free-regular-svg-icons'
import Loader from '../components/Loader'

export type TRepoLayoutOutletContext = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    repository: {
        adapter: IGoshRepositoryAdapter
        details: TRepository
    }
    wallet?: {
        instance: IGoshWallet
        details: TWalletDetails
    }
}

const RepoLayout = () => {
    const { daoName, repoName, branchName } = useParams()
    const { dao, repository, isFetching } = useRepo(daoName!, repoName!)
    const { updateBranches } = useBranches(repository.adapter)
    const [isReady, setIsReady] = useState<boolean>(false)

    const getTabs = () => {
        const tabs = [
            {
                to: `/o/${daoName}/r/${repoName}${
                    branchName ? `/tree/${branchName}` : ''
                }`,
                title: 'Files',
                icon: faFile,
            },
            {
                to: `/o/${daoName}/r/${repoName}/branches`,
                title: 'Branches',
                icon: faCodeBranch,
            },
        ]

        if (dao.details?.isAuthMember) {
            tabs.push(
                {
                    to: `/o/${daoName}/r/${repoName}/merge`,
                    title: 'Merge',
                    icon: faCodePullRequest,
                },
                {
                    to: `/o/${daoName}/r/${repoName}/upgrade`,
                    title: 'Upgrade',
                    icon: faWrench,
                },
            )
        }

        if (!!AppConfig.dockerclient) {
            tabs.push({
                to: `/o/${daoName}/r/${repoName}/build/${branchName}`,
                title: 'Build image',
                icon: faCube,
            })
        }

        return tabs
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
        <SideMenuContainer>
            <h1 className="flex flex-wrap items-center mb-6 px-5 sm:px-0">
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
                    {repository.details?.version}
                </span>
            </h1>

            {!isReady && <Loader>Loading repository...</Loader>}
            {isReady && (
                <>
                    <div
                        className={classNames(
                            'flex gap-x-9 mb-10 overflow-x-auto no-scrollbar',
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
                                        'py-2 text-gray-7c8db5 font-medium whitespace-nowrap',
                                        'border-b-4 border-b-transparent',
                                        'hover:border-black hover:text-black',
                                        isActive ? '!border-black text-black' : null,
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

                    <div>
                        {repository.details?.commitsIn.map(
                            ({ branch, commit }, index) => (
                                <div
                                    key={index}
                                    className="bg-amber-400 rounded-2xl px-4 py-2 mb-2 last:mb-6"
                                >
                                    <Spinner size="sm" className="mr-3" />
                                    <span className="text-sm">
                                        Repository is processing incoming commit
                                        <span className="font-bold mx-1">
                                            {shortString(commit.name, 7, 0, '')}
                                        </span>
                                        into branch
                                        <span className="font-bold mx-1">{branch}</span>
                                    </span>
                                </div>
                            ),
                        )}
                    </div>

                    <Outlet context={{ dao, repository }} />
                </>
            )}
        </SideMenuContainer>
    )
}

export default RepoLayout
