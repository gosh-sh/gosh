import React, { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useGoshRoot } from "../../hooks/gosh.hooks";
import { GoshRepository } from "../../types/classes";
import { IGoshRepository } from "../../types/types";
import { useQuery } from "react-query";
import RepoListItem from "./RepoListItem";
import { TDaoLayoutOutletContext } from "../DaoLayout";
import Spinner from "../../components/Spinner";


const DaoRepositoriesPage = () => {
    const goshRoot = useGoshRoot();
    const { daoName } = useParams();
    const { goshDao, goshWallet } = useOutletContext<TDaoLayoutOutletContext>();
    const [search, setSearch] = useState<string>('');

    const repoListQuery = useQuery(
        ['repositoryList'],
        async (): Promise<IGoshRepository[]> => {
            if (!goshRoot) return [];

            // Get GoshDaoRepoCode by GoshDao address and get all repos addreses
            const repoCode = await goshRoot.getDaoRepoCode(goshDao.address);
            const repoCodeHash = await goshRoot.account.client.boc.get_boc_hash({ boc: repoCode });
            const reposAddrs = await goshRoot.account.client.net.query_collection({
                collection: 'accounts',
                filter: {
                    code_hash: { eq: repoCodeHash.hash }
                },
                result: 'id'
            });
            console.debug('GoshRepos addreses:', reposAddrs?.result || []);

            // Create GoshRepository objects
            const repos = await Promise.all(
                (reposAddrs?.result || []).map(async (item) => {
                    const repo = new GoshRepository(goshRoot.account.client, item.id);
                    await repo.load();
                    return repo;
                })
            );
            console.debug('GoshRepos:', repos);
            return repos;
        },
        {
            enabled: !!goshRoot,
            select: (data) => {
                if (!search) return data;
                const pattern = new RegExp(search, 'i');
                return data.filter((repo) => repo.meta && repo.meta.name.search(pattern) >= 0);
            }
        }
    );

    return (
        <div className="bordered-block px-7 py-8">
            <h3 className="font-semibold text-base mb-4">Repositories</h3>
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="input grow">
                    <input
                        type="text"
                        autoComplete="off"
                        placeholder="Search repository..."
                        className="element !py-1.5"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {goshWallet?.isDaoParticipant && (
                    <Link
                        className="btn btn--body px-4 py-1.5 !font-normal text-center w-full sm:w-auto"
                        to={`/${goshDao.meta?.name}/repos/create`}
                    >
                        New repository
                    </Link>
                )}
            </div>

            <div className="mt-5 divide-y divide-gray-c4c4c4">
                {(repoListQuery.isIdle || repoListQuery.isLoading) && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading repositories...
                    </div>
                )}

                {repoListQuery.isFetched && !repoListQuery.data?.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no repositories yet
                    </div>
                )}

                {repoListQuery.data?.map((repository, index) => (
                    daoName && <RepoListItem key={index} daoName={daoName} repository={repository} />
                ))}
            </div>
        </div>
    );
}

export default DaoRepositoriesPage;
