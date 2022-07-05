import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import Spinner from '../../components/Spinner';
import { useGoshRoot } from '../../hooks/gosh.hooks';
import { userStateAtom } from '../../store/user.state';
import { GoshDao, GoshSmvTokenRoot, GoshWallet } from '../../types/classes';
import { IGoshDao } from '../../types/types';

const DaosPage = () => {
    const userState = useRecoilValue(userStateAtom);
    const goshRoot = useGoshRoot();
    const [search, setSearch] = useState<string>('');

    const daoListQuery = useQuery(
        ['daoList'],
        async (): Promise<{ dao: IGoshDao; supply: number }[]> => {
            if (!goshRoot || !userState.keys) return [];

            // Get GoshWallet code by user's pubkey and get all user's wallets
            const walletCode = await goshRoot.getDaoWalletCode(
                `0x${userState.keys.public}`
            );
            const walletsQuery = await goshRoot.account.client.net.query_collection({
                collection: 'accounts',
                filter: {
                    code: { eq: walletCode },
                },
                result: 'id',
            });

            // Get GoshDaos addresses from user's GoshWallets
            const daoAddrs = new Set(
                await Promise.all(
                    (walletsQuery?.result || []).map(async (item: any) => {
                        const goshWallet = new GoshWallet(
                            goshRoot.account.client,
                            item.id
                        );
                        return await goshWallet.getDaoAddr();
                    })
                )
            );

            return await Promise.all(
                Array.from(daoAddrs).map(async (addr) => {
                    // Get GoshDao object
                    const dao = new GoshDao(goshRoot.account.client, addr);
                    await dao.load();

                    // Get GoshDao total supply
                    const smvTokenRootAddr = await dao.getSmvRootTokenAddr();
                    const smvTokenRoot = new GoshSmvTokenRoot(
                        dao.account.client,
                        smvTokenRootAddr
                    );
                    const totalSupply = await smvTokenRoot.getTotalSupply();

                    return { dao, supply: totalSupply };
                })
            );
        },
        {
            enabled: !!goshRoot && !!userState.keys,
            select: (data) => {
                if (!search) return data;
                const pattern = new RegExp(search, 'i');
                return data.filter(
                    ({ dao }) => dao.meta && dao.meta.name.search(pattern) >= 0
                );
            },
        }
    );

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="input basis-full sm:basis-1/2">
                    <input
                        className="element !py-1.5"
                        type="text"
                        placeholder="Search orgranization..."
                        autoComplete="off"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Link
                    to="/account/orgs/create"
                    className="btn btn--body py-1.5 px-3 !font-normal text-center w-full sm:w-auto"
                >
                    New organization
                </Link>
            </div>

            <div className="mt-8">
                {(daoListQuery.isIdle || daoListQuery.isLoading) && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading organizations...
                    </div>
                )}
                {daoListQuery.isFetched && !daoListQuery.data?.length && (
                    <div className="text-gray-606060 text-center">
                        You have no organizations yet
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {daoListQuery.data?.map((item, index) => (
                        <div
                            key={index}
                            className="py-2 flex flex-wrap items-center justify-between gap-2"
                        >
                            <div className="basis-full sm:basis-0 sm:grow">
                                <Link
                                    to={`/${item.dao.meta?.name}`}
                                    className="text-xl font-semibold hover:underline"
                                >
                                    {item.dao.meta?.name}
                                </Link>
                            </div>
                            <div>
                                <span className="text-gray-606060 text-sm mr-2">
                                    Total supply:
                                </span>
                                {item.supply}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default DaosPage;
