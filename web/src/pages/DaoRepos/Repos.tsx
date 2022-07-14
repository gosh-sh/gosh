import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useGoshRoot } from '../../hooks/gosh.hooks';
import { GoshRepository } from '../../types/classes';
import { TGoshRepoDetails } from '../../types/types';
import RepoListItem from './RepoListItem';
import { TDaoLayoutOutletContext } from '../DaoLayout';
import Spinner from '../../components/Spinner';
import { getPaginatedAccounts } from '../../helpers';

const DaoRepositoriesPage = () => {
    const goshRoot = useGoshRoot();
    const { daoName } = useParams();
    const { dao, wallet } = useOutletContext<TDaoLayoutOutletContext>();
    const [search, setSearch] = useState<string>('');
    const [repos, setRepos] = useState<{
        list: TGoshRepoDetails[];
        lastId?: string;
        completed: boolean;
        isFetching: boolean;
    }>({
        list: [],
        completed: false,
        isFetching: true,
    });

    const getRepoList = useCallback(
        async (lastId?: string) => {
            setRepos((curr) => ({ ...curr, isFetching: true }));

            // Get GoshRepo code and paginated repos accounts
            const repoCode = await goshRoot.getDaoRepoCode(dao.address);
            const accounts = await getPaginatedAccounts({
                filters: [`code: {eq:"${repoCode}"}`],
                limit: 10,
                lastId,
            });

            // Get repos details
            const items = await Promise.all(
                accounts.results.map(async ({ id }) => {
                    const repo = new GoshRepository(goshRoot.account.client, id);
                    return await repo.getDetails();
                })
            );

            setRepos((curr) => ({
                ...curr,
                isFetching: false,
                list: [...curr.list, ...items],
                lastId: accounts.lastId,
                completed: accounts.completed,
            }));
        },
        [goshRoot, dao.address]
    );

    useEffect(() => {
        setRepos({ list: [], isFetching: true, completed: true });
        getRepoList();
    }, [getRepoList]);

    return (
        <div className="bordered-block px-7 py-8">
            <h3 className="font-semibold text-base mb-4">Repositories</h3>
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="input grow">
                    <input
                        type="text"
                        autoComplete="off"
                        placeholder="Search repository... (not available now)"
                        className="element !py-1.5"
                        value={search}
                        disabled={true}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {wallet?.isDaoParticipant && (
                    <Link
                        className="btn btn--body px-4 py-1.5 !font-normal text-center w-full sm:w-auto"
                        to={`/${daoName}/repos/create`}
                    >
                        New repository
                    </Link>
                )}
            </div>

            <div className="mt-5 divide-y divide-gray-c4c4c4">
                {repos.isFetching && !repos.list.length && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading repositories...
                    </div>
                )}

                {!repos.isFetching && !repos.list.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no repositories yet
                    </div>
                )}

                {repos.list.map(
                    (details, index) =>
                        daoName && (
                            <RepoListItem key={index} daoName={daoName} item={details} />
                        )
                )}
            </div>

            {!repos.completed && (
                <div className="text-center mt-3">
                    <button
                        className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                        type="button"
                        disabled={repos.isFetching}
                        onClick={() => getRepoList(repos.lastId)}
                    >
                        {repos.isFetching && <Spinner className="mr-2" />}
                        Load more
                    </button>
                </div>
            )}
        </div>
    );
};

export default DaoRepositoriesPage;
