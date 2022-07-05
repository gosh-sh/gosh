import { useEffect, useState } from 'react';
import { faCode, faCodePullRequest } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useGoshRepo, useGoshWallet, useGoshRepoBranches } from '../hooks/gosh.hooks';
import { IGoshRepository, IGoshWallet } from '../types/types';
import { classNames } from '../utils';
import { useRecoilValue } from 'recoil';
import { userStatePersistAtom } from '../store/user.state';

export type TRepoLayoutOutletContext = {
    goshRepo: IGoshRepository;
    goshWallet?: IGoshWallet;
};

const RepoLayout = () => {
    const userStatePersist = useRecoilValue(userStatePersistAtom);
    const { daoName, repoName } = useParams();
    const goshRepo = useGoshRepo(daoName, repoName);
    const goshWallet = useGoshWallet(daoName);
    const { updateBranches } = useGoshRepoBranches(goshRepo);
    const [isFetched, setIsFetched] = useState<boolean>(false);

    const tabs = [
        {
            to: `/${daoName}/${repoName}`,
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
    ];

    useEffect(() => {
        const init = async (repo: IGoshRepository) => {
            await updateBranches();
            setIsFetched(true);
        };

        const walletAwaited =
            !userStatePersist.phrase || (userStatePersist.phrase && goshWallet);
        if (goshRepo && walletAwaited) init(goshRepo);
    }, [goshRepo, goshWallet, userStatePersist.phrase, updateBranches]);

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
                            .filter((item) => (!goshWallet ? item.public : item))
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
                                                : null
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

                    <Outlet context={{ goshRepo, goshWallet }} />
                </>
            )}
        </div>
    );
};

export default RepoLayout;
