import { useState } from 'react'
import { useQuery } from 'react-query'
import { useRecoilValue } from 'recoil'
import Spinner from '../../components/Spinner'
import { AppConfig, useGosh, useGoshVersions } from 'react-gosh'
import {
    GoshDao,
    GoshRepository,
    GoshWallet,
    userAtom,
    TGoshRepoDetails,
} from 'react-gosh'
import RepoListItem from '../DaoRepos/RepoListItem'

const RepositoriesPage = () => {
    const userState = useRecoilValue(userAtom)
    const gosh = useGosh()
    const { versions } = useGoshVersions()
    const [search, setSearch] = useState<string>()
    const repoListQuery = useQuery(
        ['userRepositoryList'],
        async (): Promise<{ repo: TGoshRepoDetails; daoName?: string }[]> => {
            if (!userState.keys || !gosh) return []

            // Get GoshWallet code by user's pubkey and get all user's wallets
            const walletCodeHash = await gosh.getDaoWalletCodeHash()
            const walletAddrs = await gosh.client.net.query_collection({
                collection: 'accounts',
                filter: {
                    code_hash: { eq: walletCodeHash },
                },
                result: 'id',
            })

            // Get GoshDaos from user's GoshWallets
            const daoAddrs = new Set(
                await Promise.all(
                    (walletAddrs?.result || []).map(async (item: any) => {
                        const wallet = new GoshWallet(
                            AppConfig.goshroot.account.client,
                            item.id,
                            versions.latest,
                        )
                        return await wallet.getDaoAddr()
                    }),
                ),
            )
            const daos = Array.from(daoAddrs).map((addr) => {
                return new GoshDao(AppConfig.goshclient, addr)
            })

            // Get repos for each DAO
            const repos = await Promise.all(
                daos.map(async (dao) => {
                    const repoCodeHash = await gosh.getRepositoryCodeHash(dao.address)
                    const repoAddrs = await gosh.client.net.query_collection({
                        collection: 'accounts',
                        filter: {
                            code_hash: { eq: repoCodeHash },
                        },
                        result: 'id',
                    })

                    const repos = await Promise.all(
                        (repoAddrs?.result || []).map(async (item) => {
                            const repo = new GoshRepository(
                                AppConfig.goshclient,
                                item.id,
                                versions.latest,
                            )
                            return await repo.getDetails()
                        }),
                    )
                    // TODO: Get dao name
                    // return repos.map((repo) => ({ repo, daoName: dao.meta?.name }))
                    return repos.map((repo) => ({ repo, daoName: '' }))
                }),
            )

            return repos.reduce((items: any[], item) => {
                items.push(...item)
                return items
            }, [])
        },
        {
            enabled: !!AppConfig.goshroot && !!userState.keys?.public,
            select: (data) => {
                if (!search) return data
                const pattern = new RegExp(search, 'i')
                return data.filter((item) => {
                    return `${item.daoName}/${item.repo.name}`.search(pattern) >= 0
                })
            },
        },
    )

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
                                item={repo}
                                daoLink
                            />
                        ),
                )}
            </div>
        </>
    )
}

export default RepositoriesPage
