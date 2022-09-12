import { useEffect, useState } from 'react'
import { faCode, faCodePullRequest, faCube } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useGoshRepo, useGoshRepoBranches } from '../hooks/gosh.hooks'
import {
    IGoshRepository,
    IGoshWallet,
    classNames,
    userPersistAtom,
    useDao,
    useWallet,
    TWalletDetails,
} from 'react-gosh'
import { useRecoilValue } from 'recoil'

export type TRepoLayoutOutletContext = {
    repo: IGoshRepository
    wallet?: {
        instance: IGoshWallet
        details: TWalletDetails
    }
}

const RepoLayout = () => {
    const userStatePersist = useRecoilValue(userPersistAtom)
    const { daoName, repoName, branchName = 'main' } = useParams()
    const repo = useGoshRepo(daoName, repoName)
    const dao = useDao(daoName)
    const wallet = useWallet(dao.instance)
    const { updateBranches } = useGoshRepoBranches(repo)
    const [isFetched, setIsFetched] = useState<boolean>(false)

    const tabs = [
        {
            to: `/${daoName}/${repoName}/tree/${branchName}`,
            title: 'Code',
            icon: faCode,
            public: true,
        },
        {
            to: `/${daoName}/${repoName}/pull`,
            title: 'Pull request',
            icon: faCodePullRequest,
            public: false,
        },
    ]

    if (process.env.REACT_APP_ISDOCKEREXT === 'true') {
        tabs.push({
            to: `/${daoName}/${repoName}/build/${branchName}`,
            title: 'Build image',
            icon: faCube,
            public: false,
        })
    }

    useEffect(() => {
        const init = async () => {
            await updateBranches()
            setIsFetched(true)
        }

        const walletAwaited =
            !userStatePersist.phrase || (userStatePersist.phrase && wallet)
        if (repo && walletAwaited) init()
    }, [repo, wallet, userStatePersist.phrase, updateBranches])

    return (
        <div className="container container--full my-10">
            <h1 className="flex items-center mb-6 px-5 sm:px-0">
                <Link
                    to={`/${daoName}`}
                    className="font-semibold text-xl hover:underline"
                >
                    {daoName}
                </Link>
                <span className="mx-2">/</span>
                <Link
                    to={`/${daoName}/${repoName}`}
                    className="font-semibold text-xl hover:underline"
                >
                    {repoName}
                </Link>
            </h1>

            {!isFetched && (
                <div className="text-gray-606060 px-5 sm:px-0">
                    <Spinner className="mr-3" />
                    Loading repository...
                </div>
            )}

            {isFetched && (
                <>
                    <div className="flex gap-x-6 mb-6 px-5 sm:px-0">
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
                                    <FontAwesomeIcon
                                        icon={item.icon}
                                        size="sm"
                                        className="mr-2"
                                    />
                                    {item.title}
                                </NavLink>
                            ))}
                    </div>

                    <Outlet context={{ repo, wallet }} />
                </>
            )}
        </div>
    )
}

export default RepoLayout
