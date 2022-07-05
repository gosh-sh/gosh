import { useState } from 'react';
import { useQuery } from 'react-query';
import { useRecoilValue } from 'recoil';
import Spinner from '../../components/Spinner';
import { useGoshRoot } from '../../hooks/gosh.hooks';
import { userStateAtom } from '../../store/user.state';
import { GoshDao, GoshRepository, GoshWallet } from '../../types/classes';
import { IGoshRepository } from '../../types/types';
import RepoListItem from '../DaoRepos/RepoListItem';

const RepositoriesPage = () => {
    const userState = useRecoilValue(userStateAtom);
    const goshRoot = useGoshRoot();
    const [search, setSearch] = useState<string>();
    const repoListQuery = useQuery(
        ['userRepositoryList'],
        async (): Promise<{ repo: IGoshRepository; daoName?: string }[]> => {
            if (!goshRoot || !userState.keys) return [];

            // Get GoshWallet code by user's pubkey and get all user's wallets
            const walletCode = await goshRoot.getDaoWalletCode(
                `0x${userState.keys.public}`
            );
            const walletCodeHash = await goshRoot.account.client.boc.get_boc_hash({
                boc: walletCode,
            });
            const walletAddrs = await goshRoot.account.client.net.query_collection({
                collection: 'accounts',
                filter: {
                    code_hash: { eq: walletCodeHash.hash },
                },
                result: 'id',
            });

            // Get GoshDaos from user's GoshWallets
            const daoAddrs = new Set(
                await Promise.all(
                    (walletAddrs?.result || []).map(async (item: any) => {
                        const wallet = new GoshWallet(goshRoot.account.client, item.id);
                        return await wallet.getDaoAddr();
                    })
                )
            );
            const daos = Array.from(daoAddrs).map((addr) => {
                return new GoshDao(goshRoot.account.client, addr);
            });

            // Get repos for each DAO
            const repos = await Promise.all(
                daos.map(async (dao) => {
                    const repoCode = await goshRoot.getDaoRepoCode(dao.address);
                    const repoCodeHash = await goshRoot.account.client.boc.get_boc_hash({
                        boc: repoCode,
                    });
                    const repoAddrs = await goshRoot.account.client.net.query_collection({
                        collection: 'accounts',
                        filter: {
                            code_hash: { eq: repoCodeHash.hash },
                        },
                        result: 'id',
                    });

                    await dao.load();
                    const repos = await Promise.all(
                        (repoAddrs?.result || []).map(async (item) => {
                            const repo = new GoshRepository(
                                goshRoot.account.client,
                                item.id
                            );
                            await repo.load();
                            return repo;
                        })
                    );
                    return repos.map((repo) => ({ repo, daoName: dao.meta?.name }));
                })
            );

            return repos.reduce((items: any[], item) => {
                items.push(...item);
                return items;
            }, []);
        },
        {
            enabled: !!goshRoot && !!userState.keys?.public,
            select: (data) => {
                if (!search) return data;
                const pattern = new RegExp(search, 'i');
                return data.filter((item) => {
                    return `${item.daoName}/${item.repo.meta?.name}`.search(pattern) >= 0;
                });
            },
        }
    );

    return (
        <>
            <h3 className="font-semibold text-base mb-4">Repositories</h3>
            <div className="flex flex-wrap gap-4 justify-between">
                <div className="input grow">
                    <input
                        type="text"
                        autoComplete="off"
                        placeholder="Search repository..."
                        className="element !py-1.5"
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
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

                {repoListQuery.data?.map(
                    ({ daoName, repo }, index) =>
                        daoName && (
                            <RepoListItem
                                key={index}
                                daoName={daoName}
                                repository={repo}
                                daoLink
                            />
                        )
                )}
            </div>
        </>
    );
};

export default RepositoriesPage;
